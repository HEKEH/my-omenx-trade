import {
  FEE_RATE,
  UI_LEVERAGE,
  clamp01,
  isContractQuantity,
  isValidLeverage,
  isValidPrice,
  round2,
  round4,
  type Bounds,
} from "../shared";

export type OrderType = "Market" | "Limit";

/** Contracts bought by `amount` of margin at `leverage` (whole contracts). */
export const quantityForAmount = (amount: number, leverage: number, price: number) =>
  price > 0 && amount > 0 ? Math.round((amount * leverage) / price) : 0;

/** Margin-sized amount that buys `quantity` contracts. */
export const amountForQuantity = (quantity: number, leverage: number, price: number) =>
  leverage > 0 ? round2((quantity * price) / leverage) : 0;

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
  const notional = price * quantity;
  const margin = reducing || leverage <= 0 ? 0 : round2(notional / leverage);
  const fee = round2(notional * FEE_RATE);
  return { notional: round2(notional), margin, fee, total: round2(margin + fee) };
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
    potentialWin: Math.round((1 - price) * quantity),
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
  | "insufficient-balance";

const MAX_AMOUNT = 10_000_000;
const MAX_QUANTITY = 100_000_000;

/** Every rule the order breaks; empty when it can be submitted. */
export const validateOrder = ({
  price,
  amount,
  quantity,
  leverage,
  total,
  availableBalance,
  leverageBounds = UI_LEVERAGE,
}: {
  price: number;
  amount: number;
  quantity: number;
  leverage: number;
  orderType: OrderType;
  total: number;
  availableBalance: number;
  leverageBounds?: Bounds;
}): OrderRuleViolation[] => {
  const violations: OrderRuleViolation[] = [];
  if (!isValidPrice(price)) violations.push("invalid-price");
  if (!(amount > 0 && amount <= MAX_AMOUNT)) violations.push("invalid-amount");
  if (!isContractQuantity(quantity) || quantity > MAX_QUANTITY) violations.push("invalid-quantity");
  if (!isValidLeverage(leverage, leverageBounds)) violations.push("invalid-leverage");
  if (availableBalance < total) violations.push("insufficient-balance");
  return violations;
};
