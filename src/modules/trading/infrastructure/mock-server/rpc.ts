import {
  SERVER_LEVERAGE,
  applyBalanceDelta,
  averageEntry,
  binaryOutcome,
  isBinaryMarket,
  isContractQuantity,
  isValidLeverage,
  isValidPrice,
  mirrorPrice,
  orderCost,
  round2,
} from "../../domain";
import type {
  PositionRow,
  ProcessBinaryTradeArgs,
  ProcessBinaryTradeResult,
  TradeIntentResult,
  TradeRow,
} from "../supabase-shape/rows";
import type { MockDatabase } from "./db";
import { MOCK_USER_ID, orderSnapshot, reservationFor } from "./seed";

export class RpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RpcError";
  }
}

const OPEN_STATUSES = ["Pending", "Partial Filled"];

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();
const outcomeOf = (label: string | null | undefined) => binaryOutcome(label);

/**
 * Mock of the `process_binary_trade` database function (reference migration
 * `binary_market_netting.sql`). It owns every binary Yes/No order: placing,
 * filling and cancelling, including netting against the opposite outcome and
 * the account balance. It returns `null` for any market that is not a
 * single-market binary, so the caller falls back to plain table writes.
 *
 * Deviations from the reference, as agreed: only the real balance is used
 * (the trial balance is ignored), and prices keep four decimals.
 */
export const processBinaryTrade = (
  db: MockDatabase,
  args: ProcessBinaryTradeArgs,
  userId: string = MOCK_USER_ID,
): ProcessBinaryTradeResult | null => {
  if (!["place", "fill", "cancel"].includes(args.p_mode)) throw new RpcError("Invalid trade action");

  let eventName: string;
  let label: "yes" | "no" | null;
  if (args.p_mode === "place") {
    eventName = args.p_event_name ?? "";
    label = outcomeOf(args.p_option_label);
  } else {
    const trade = db.find("trades", (row) => row.id === args.p_order_id && row.user_id === userId);
    if (!trade) throw new RpcError("Order not found");
    eventName = trade.event_name;
    label = outcomeOf(trade.option_label);
  }
  if (!label) return null;

  const events = db.rows("events").filter((event) => event.name === eventName);
  if (events.length === 0) return null;
  if (events.length > 1) throw new RpcError("Ambiguous market");
  const options = db.rows("event_options").filter((option) => option.event_id === events[0].id);
  if (!isBinaryMarket(options)) return null;
  const optionId = options.find((option) => outcomeOf(option.label) === label)!.id;

  const profile = db.find("profiles", (row) => row.user_id === userId);
  if (!profile) throw new RpcError("Account not found");
  const balance = profile.balance ?? 0;
  const setBalance = (next: number) => db.update("profiles", (row) => row.user_id === userId, { balance: next });

  if (args.p_mode === "cancel") {
    const trade = db.find("trades", (row) => row.id === args.p_order_id && row.user_id === userId)!;
    if (trade.status !== "Pending") throw new RpcError("Order is no longer pending");
    const reservation = db.find("binary_order_reservations", (row) => row.trade_id === trade.id);
    if (!reservation) throw new RpcError("Legacy binary order requires manual review");
    const [cancelled] = db.update("trades", (row) => row.id === trade.id, { status: "Cancelled", updated_at: now() });
    setBalance(applyBalanceDelta(balance, reservation.real_amount));
    return { handled: true, trade: cancelled };
  }

  // Positions in this market: only long Yes/No positions are legal, one direction at a time.
  const open = db
    .rows("positions")
    .filter((row) => row.user_id === userId && row.event_name === eventName && row.status === "Open")
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  let yesQty = 0;
  let noQty = 0;
  for (const position of open) {
    const outcome = outcomeOf(position.option_label);
    if (position.side !== "long" || !outcome) {
      throw new RpcError("This market has a legacy position that requires manual review");
    }
    if (outcome === "yes") yesQty += position.size;
    else noQty += position.size;
  }
  if (yesQty > 0 && noQty > 0) throw new RpcError("This market has conflicting legacy positions; new trades are unavailable");

  let order: Pick<TradeRow, "side" | "order_type" | "price" | "amount" | "quantity" | "leverage"> & {
    tp_value: number | null;
    tp_mode: string | null;
    sl_value: number | null;
    sl_mode: string | null;
  };
  let pendingTrade: TradeRow | undefined;
  if (args.p_mode === "place") {
    if (args.p_option_id && args.p_option_id !== optionId) throw new RpcError("Option does not belong to this market");
    order = {
      side: args.p_side ?? "",
      order_type: args.p_order_type ?? "",
      price: args.p_price ?? Number.NaN,
      amount: args.p_amount ?? Number.NaN,
      quantity: args.p_quantity ?? Number.NaN,
      leverage: args.p_leverage ?? Number.NaN,
      tp_value: args.p_tp_value ?? null,
      tp_mode: args.p_tp_mode ?? null,
      sl_value: args.p_sl_value ?? null,
      sl_mode: args.p_sl_mode ?? null,
    };
  } else {
    pendingTrade = db.find("trades", (row) => row.id === args.p_order_id && row.user_id === userId)!;
    if (pendingTrade.status !== "Pending") throw new RpcError("Order is no longer pending");
    const reservation = db.find("binary_order_reservations", (row) => row.trade_id === pendingTrade!.id);
    if (!reservation) throw new RpcError("Legacy binary order requires manual review");
    if (JSON.stringify(reservation.order_snapshot) !== JSON.stringify(orderSnapshot(pendingTrade))) {
      throw new RpcError("Pending order changed after placement");
    }
    order = pendingTrade;
  }

  if (
    order.side !== "buy" ||
    !isContractQuantity(order.quantity) ||
    !isValidPrice(order.price) ||
    !(order.amount > 0) ||
    !isValidLeverage(order.leverage, SERVER_LEVERAGE) ||
    !["Market", "Limit"].includes(order.order_type)
  ) {
    throw new RpcError("Invalid binary order");
  }

  const oppositeQty = label === "yes" ? noQty : yesQty;
  const reducing = oppositeQty > 0;
  if (reducing && order.quantity > oppositeQty) {
    throw new RpcError("Order exceeds the opposite position. Close it first, then place a separate order");
  }

  if (args.p_mode === "place") {
    const pending = db
      .rows("trades")
      .filter(
        (row) =>
          row.user_id === userId && row.event_name === eventName && row.side === "buy" && OPEN_STATUSES.includes(row.status),
      );
    const pendingSame = pending.filter((row) => outcomeOf(row.option_label) === label).reduce((s, r) => s + r.quantity, 0);
    const pendingOpposite = pending
      .filter((row) => outcomeOf(row.option_label) !== label)
      .reduce((s, r) => s + r.quantity, 0);
    if ((reducing && order.quantity + pendingSame > oppositeQty) || (yesQty === 0 && noQty === 0 && pendingOpposite > 0)) {
      throw new RpcError("Opposite pending orders exceed the position available to close");
    }
  }

  let { margin, fee } = orderCost({ price: order.price, quantity: order.quantity, leverage: order.leverage, reducing });
  if (!reducing && margin <= 0) throw new RpcError("Opening margin is too small");

  let trade: TradeRow;
  if (args.p_mode === "fill") {
    // A pending order cannot silently switch between reducing and opening.
    if ((reducing && pendingTrade!.margin !== 0) || (!reducing && pendingTrade!.margin === 0)) {
      throw new RpcError("Position changed after this order was placed; cancel and place a new order");
    }
    margin = pendingTrade!.margin;
    fee = pendingTrade!.fee;
    trade = pendingTrade!;
  } else {
    const createdAt = now();
    trade = db.insert("trades", {
      amount: order.amount,
      closed_at: null,
      created_at: createdAt,
      event_name: eventName,
      fee,
      funding_paid: 0,
      id: newId(),
      leverage: order.leverage,
      margin,
      option_label: args.p_option_label ?? "",
      order_type: order.order_type,
      pnl: null,
      price: order.price,
      quantity: order.quantity,
      side: order.side,
      sl_mode: order.sl_mode,
      sl_value: order.sl_value,
      status: order.order_type === "Market" ? "Filled" : "Pending",
      tp_mode: order.tp_mode,
      tp_value: order.tp_value,
      updated_at: createdAt,
      user_id: userId,
    });
    if (order.order_type === "Limit") db.insert("binary_order_reservations", reservationFor(trade));
  }

  let delta = 0;
  let intent: TradeIntentResult;
  let resultPosition: PositionRow | null = null;

  if (args.p_mode === "place" && order.order_type === "Limit") {
    delta = -(margin + fee);
    intent = reducing ? "reduce" : "open";
  } else if (reducing) {
    // Buying the other outcome at p closes this one at 1 − p, oldest first.
    const closePrice = mirrorPrice(order.price);
    let remaining = order.quantity;
    let released = 0;
    let pnl = 0;
    let funding = 0;
    for (const position of open.filter((row) => outcomeOf(row.option_label) !== label)) {
      const slice = Math.min(remaining, position.size);
      if (slice <= 0) break;
      const share = slice / position.size;
      const fundingSlice = position.funding_accrued * share;
      const slicePnl = (closePrice - position.entry_price) * slice - fundingSlice;
      released += position.margin * share;
      pnl += slicePnl;
      funding += fundingSlice;
      const patch: Partial<PositionRow> =
        slice === position.size
          ? { status: "Closed", closed_at: now(), mark_price: closePrice, pnl: (position.pnl ?? 0) + slicePnl }
          : {
              size: position.size - slice,
              margin: position.margin - position.margin * share,
              funding_accrued: position.funding_accrued - fundingSlice,
              mark_price: closePrice,
              pnl: (position.pnl ?? 0) + slicePnl,
            };
      [resultPosition] = db.update("positions", (row) => row.id === position.id, { ...patch, updated_at: now() });
      remaining -= slice;
      if (remaining === 0) break;
    }
    if (remaining !== 0) throw new RpcError("Position changed during execution");
    intent = order.quantity === oppositeQty ? "close" : "reduce";
    [trade] = db.update("trades", (row) => row.id === trade.id, {
      pnl,
      funding_paid: funding,
      status: "Filled",
      closed_at: intent === "close" ? now() : null,
      updated_at: now(),
    });
    // A filled limit order already paid its fee when it was reserved.
    delta = released + pnl - (args.p_mode === "place" ? fee : 0);
  } else {
    const existing = open.find((row) => outcomeOf(row.option_label) === label);
    if (existing) {
      [resultPosition] = db.update("positions", (row) => row.id === existing.id, {
        entry_price: averageEntry(
          { size: existing.size, entryPrice: existing.entry_price },
          { quantity: order.quantity, price: order.price },
        ),
        size: existing.size + order.quantity,
        margin: existing.margin + margin,
        tp_value: order.tp_value ?? existing.tp_value,
        tp_mode: order.tp_mode ?? existing.tp_mode,
        sl_value: order.sl_value ?? existing.sl_value,
        sl_mode: order.sl_mode ?? existing.sl_mode,
        updated_at: now(),
      });
      intent = "add";
    } else {
      const createdAt = now();
      resultPosition = db.insert("positions", {
        closed_at: null,
        created_at: createdAt,
        entry_price: order.price,
        event_name: eventName,
        funding_accrued: 0,
        id: newId(),
        last_funding_at: createdAt,
        leverage: order.leverage,
        margin,
        mark_price: order.price,
        option_id: optionId,
        option_label: trade.option_label,
        pnl: 0,
        pnl_percent: 0,
        side: "long",
        size: order.quantity,
        sl_mode: order.sl_mode,
        sl_value: order.sl_value,
        status: "Open",
        tp_mode: order.tp_mode,
        tp_value: order.tp_value,
        trade_id: trade.id,
        updated_at: createdAt,
        user_id: userId,
      });
      intent = "open";
    }
    if (args.p_mode === "fill") {
      [trade] = db.update("trades", (row) => row.id === trade.id, { status: "Filled", closed_at: now(), updated_at: now() });
    } else {
      delta = -(margin + fee);
    }
  }

  delta = round2(delta);
  if (delta !== 0) setBalance(applyBalanceDelta(balance, delta));

  return {
    handled: true,
    trade,
    position: resultPosition,
    intent,
    balanceDelta: delta,
    balanceHandled: true,
  };
};
