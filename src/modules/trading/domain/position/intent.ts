import { binaryOutcome } from "../market";
import { EPSILON, mirrorPrice, round4, toSide, type OrderSide, type Side } from "../shared";

/** An open position as the domain sees it. Prices are in the position's side space. */
export interface PositionSnapshot {
  id: string;
  eventName: string;
  optionLabel: string;
  side: Side;
  /** Contracts. */
  size: number;
  entryPrice: number;
  margin: number;
  fundingAccrued: number;
  createdAt?: string;
  isAirdrop?: boolean;
}

export interface PendingOrderSnapshot {
  eventName: string;
  optionLabel: string;
  side: OrderSide;
  quantity: number;
  status: string;
}

export type OrderIntentKind = "open" | "add" | "reduce" | "close" | "blocked-cross-zero" | "blocked-market";

export interface OrderIntent {
  kind: OrderIntentKind;
  /** Position the order nets against (opposite) or extends (same side). */
  existingPosition?: PositionSnapshot;
  existingQty: number;
  requestedQty: number;
  /** Signed exposure before/after, positive = long (or Yes in a binary market). */
  qBefore: number;
  qAfter: number;
  closeQty: number;
  increaseQty: number;
  tradedNotional: number;
  openingNotional: number;
  incrementalMargin: number;
  releasedMargin: number;
  realizedPnl: number;
  blockReason?: string;
}

const OPEN_ORDER_STATUSES = new Set(["Pending", "Partial Filled"]);

const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const byCreatedAt = (a: PositionSnapshot, b: PositionSnapshot) =>
  (a.createdAt ?? "").localeCompare(b.createdAt ?? "");

/**
 * Decides what an order does to the user's exposure on one option.
 *
 * Every position is long in its own side's price space, so an opposite order
 * traded at `price` closes the position at `1 − price`. In a binary market the
 * Yes and No options net against each other (buying No reduces Yes); on a
 * multi-outcome option long and short net against each other. An order may
 * never cross zero: the user must close first.
 */
export const classifyOrderIntent = ({
  positions,
  pendingOrders,
  eventName,
  optionLabel,
  side,
  quantity,
  price,
  leverage,
  binary,
}: {
  positions: readonly PositionSnapshot[];
  pendingOrders: readonly PendingOrderSnapshot[];
  eventName: string;
  optionLabel: string;
  side: OrderSide;
  quantity: number;
  /** Price the order trades at, in the order side's space. */
  price: number;
  leverage: number;
  binary: boolean;
}): OrderIntent => {
  const orderSide = toSide(side);
  const orderPrice = round4(price);
  const binaryBuy = binary && side === "buy";
  const inMarket = positions.filter((position) => position.eventName === eventName);
  const relevant = inMarket.filter(
    (position) =>
      !position.isAirdrop &&
      (binaryBuy ? binaryOutcome(position.optionLabel) !== null : sameLabel(position.optionLabel, optionLabel)),
  );

  const isSame = (position: PositionSnapshot) =>
    binaryBuy ? sameLabel(position.optionLabel, optionLabel) : position.side === orderSide;
  const sameSide = relevant.find(isSame);
  const oppositeSide = relevant.find((position) => !isSame(position));
  const existingPosition = oppositeSide ?? sameSide;
  const matching = existingPosition
    ? binaryBuy
      ? relevant.filter((position) => sameLabel(position.optionLabel, existingPosition.optionLabel)).sort(byCreatedAt)
      : [existingPosition]
    : [];

  const existingQty = matching.reduce((sum, position) => sum + position.size, 0);
  const requestedQty = Math.max(0, quantity || 0);
  const signOf = (label: string, positionSide: Side) =>
    binaryBuy ? (binaryOutcome(label) === "no" ? -1 : 1) : positionSide === "long" ? 1 : -1;
  const qBefore = existingPosition ? signOf(existingPosition.optionLabel, existingPosition.side) * existingQty : 0;
  const dq = signOf(optionLabel, orderSide) * requestedQty;

  const base = {
    existingPosition,
    existingQty,
    requestedQty,
    qBefore,
    qAfter: qBefore + dq,
    tradedNotional: orderPrice * requestedQty,
  };
  const none = { closeQty: 0, increaseQty: 0, openingNotional: 0, incrementalMargin: 0, releasedMargin: 0, realizedPnl: 0 };
  const opening = (increaseQty: number) => {
    const openingNotional = orderPrice * increaseQty;
    return { increaseQty, openingNotional, incrementalMargin: openingNotional / Math.max(leverage, 1) };
  };

  if (binaryBuy) {
    const hasAirdrop = inMarket.some((position) => position.isAirdrop);
    const hasLegacyConflict =
      relevant.some((position) => position.side !== "long") || (sameSide !== undefined && oppositeSide !== undefined);
    if (hasAirdrop || hasLegacyConflict) {
      return {
        ...base,
        ...none,
        kind: "blocked-market",
        blockReason: "This market has an airdrop or conflicting legacy position. New orders are unavailable.",
      };
    }

    const marketPending = pendingOrders.filter(
      (order) =>
        order.eventName === eventName &&
        order.side === "buy" &&
        binaryOutcome(order.optionLabel) !== null &&
        OPEN_ORDER_STATUSES.has(order.status),
    );
    const pendingQty = (same: boolean) =>
      marketPending
        .filter((order) => sameLabel(order.optionLabel, optionLabel) === same)
        .reduce((sum, order) => sum + order.quantity, 0);
    if (
      (oppositeSide && requestedQty + pendingQty(true) > existingQty + EPSILON) ||
      (!existingPosition && pendingQty(false) > 0)
    ) {
      return {
        ...base,
        ...none,
        kind: "blocked-cross-zero",
        blockReason: "Opposite pending orders or this order exceed the position available to close.",
      };
    }
  }

  if (!existingPosition || existingQty <= EPSILON) {
    return { ...base, ...none, ...opening(requestedQty), kind: "open", existingQty: 0, qBefore: 0, qAfter: dq };
  }

  if (existingPosition === sameSide) {
    return { ...base, ...none, ...opening(requestedQty), kind: "add" };
  }

  // Opposite order: close oldest positions first, in their own price space.
  const closePrice = mirrorPrice(orderPrice);
  const closeQty = Math.min(requestedQty, existingQty);
  let remaining = closeQty;
  let releasedMargin = 0;
  let realizedPnl = 0;
  for (const position of matching) {
    const slice = Math.min(remaining, position.size);
    if (slice <= 0) break;
    const share = slice / position.size;
    releasedMargin += position.margin * share;
    realizedPnl += (closePrice - position.entryPrice) * slice - position.fundingAccrued * share;
    remaining -= slice;
  }

  if (requestedQty > existingQty + EPSILON) {
    return {
      ...base,
      ...opening(requestedQty - existingQty),
      kind: "blocked-cross-zero",
      closeQty: existingQty,
      releasedMargin,
      realizedPnl,
      blockReason: "Order exceeds the opposite position. Close it first, then place a separate order.",
    };
  }

  return {
    ...base,
    ...none,
    kind: Math.abs(requestedQty - existingQty) <= EPSILON ? "close" : "reduce",
    closeQty,
    releasedMargin,
    realizedPnl,
  };
};

/** Whether an order of this intent releases margin instead of posting it. */
export const isReducing = (kind: OrderIntentKind) => kind === "reduce" || kind === "close";

export const isBlocked = (kind: OrderIntentKind) => kind === "blocked-cross-zero" || kind === "blocked-market";
