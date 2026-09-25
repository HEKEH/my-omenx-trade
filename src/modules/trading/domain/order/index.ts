import {
  UI_LEVERAGE,
  clamp01,
  divRoundHalfUp,
  feeFor,
  isContractQuantity,
  isValidLeverage,
  isValidPrice,
  notionalUnits,
  round2,
  round4,
  toUnits,
  type Bounds,
  type OrderSide,
} from "../shared";

export type OrderType = "Market" | "Limit";

/**
 * Contracts bought by `amount` of margin at `leverage`, rounded half up to
 * whole contracts. Computed in cents and 1e-4 price units so an exact half
 * (0.35 / 0.1 = 3.5) is not lost to floating point.
 */
export const quantityForAmount = (amount: number, leverage: number, price: number) => {
  const priceUnits = toUnits(price, 4);
  const amountCents = toUnits(amount, 2);
  if (priceUnits <= 0 || amountCents <= 0) return 0;
  return divRoundHalfUp(amountCents * leverage * 100, priceUnits);
};

/** Margin-sized amount that buys `quantity` contracts; a quantity is whole contracts. */
export const amountForQuantity = (quantity: number, leverage: number, price: number) =>
  leverage > 0 ? round2((Math.round(quantity) * price) / leverage) : 0;

/** Order amount for a share (0–100%) of the available balance, in cents. */
export const amountForBalancePercent = (available: number, percent: number) =>
  available > 0 && percent > 0 ? round2((available * percent) / 100) : 0;

export interface OrderCost {
  notional: number;
  margin: number;
  fee: number;
  total: number;
}

/**
 * What an order costs, by the server's rules: fee on `price × quantity`, and
 * no margin when the order only reduces an existing position.
 */
export const orderCost = ({
  price,
  quantity,
  leverage,
  reducing,
}: {
  price: number;
  quantity: number;
  leverage: number;
  reducing: boolean;
}): OrderCost => {
  // Exact decimal math, like the server: notional in 1e-4 units, money in cents.
  const units = notionalUnits(price, quantity);
  const margin = reducing || leverage <= 0 ? 0 : divRoundHalfUp(units, leverage * 100) / 100;
  const fee = feeFor(price, quantity);
  return { notional: divRoundHalfUp(units, 100) / 100, margin, fee, total: round2(margin + fee) };
};

export interface OrderPreview {
  quantity: number;
  cost: OrderCost;
  /** Payout above cost if the outcome resolves in the order's favour. */
  potentialWin: number;
}

/**
 * Preview for an opening order. `price` is what the order trades at: the side
 * price for a market order, the limit price for a limit order.
 */
export const computeOrderPreview = ({
  amount,
  leverage,
  price,
}: {
  amount: number;
  leverage: number;
  price: number;
}): OrderPreview => {
  const quantity = quantityForAmount(amount, leverage, price);
  return {
    quantity,
    cost: orderCost({ price, quantity, leverage, reducing: false }),
    potentialWin: divRoundHalfUp((10_000 - toUnits(price, 4)) * quantity, 10_000),
  };
};

export type TpSlKind = "tp" | "sl";
export type TpSlMode = "pct" | "price";

/**
 * Absolute trigger price for a TP/SL input. Every position is long in its own
 * side's price space, so take-profit sits above the entry and stop-loss below.
 */
export const resolveTpSlPrice = ({
  kind,
  mode,
  value,
  basePrice,
}: {
  kind: TpSlKind;
  mode: TpSlMode;
  value: number;
  basePrice: number;
}) => {
  if (mode === "price") return round4(value);
  const offset = kind === "tp" ? value / 100 : -value / 100;
  return round4(clamp01(basePrice * (1 + offset)));
};

export const estimateTpSlPnl = ({
  target,
  basePrice,
  quantity,
}: {
  target: number;
  basePrice: number;
  quantity: number;
}) => round2((target - basePrice) * quantity);

export type OrderRuleViolation =
  | "invalid-price"
  | "invalid-amount"
  | "invalid-quantity"
  | "invalid-leverage"
  | "invalid-order-type"
  | "invalid-side"
  | "margin-too-small"
  | "insufficient-balance";

const MAX_AMOUNT = 10_000_000;
const MAX_QUANTITY = 100_000_000;

const ORDER_TYPES: readonly string[] = ["Market", "Limit"];

/** Every rule the order breaks; empty when it can be submitted. */
export const validateOrder = ({
  price,
  amount,
  quantity,
  leverage,
  orderType,
  total,
  availableBalance,
  side = "buy",
  binary = false,
  margin,
  reducing = false,
  leverageBounds = UI_LEVERAGE,
}: {
  price: number;
  amount: number;
  quantity: number;
  leverage: number;
  orderType: OrderType;
  total: number;
  availableBalance: number;
  side?: OrderSide;
  /** Binary markets only take buy orders (No is bought, not sold). */
  binary?: boolean;
  /** Margin the order posts; an opening order must post more than 0. */
  margin?: number;
  reducing?: boolean;
  leverageBounds?: Bounds;
}): OrderRuleViolation[] => {
  const violations: OrderRuleViolation[] = [];
  if (!isValidPrice(price) || round4(price) !== price) violations.push("invalid-price");
  if (!ORDER_TYPES.includes(orderType)) violations.push("invalid-order-type");
  if (binary && side !== "buy") violations.push("invalid-side");
  if (margin !== undefined && !reducing && !(margin > 0)) violations.push("margin-too-small");
  if (!(amount > 0 && amount <= MAX_AMOUNT)) violations.push("invalid-amount");
  if (!isContractQuantity(quantity) || quantity > MAX_QUANTITY) violations.push("invalid-quantity");
  if (!isValidLeverage(leverage, leverageBounds)) violations.push("invalid-leverage");
  if (availableBalance < total) violations.push("insufficient-balance");
  return violations;
};
