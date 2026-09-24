/**
 * Shared primitives for the trading domain: rounding, price-space helpers,
 * and the bounds that every order must respect.
 */

/** Tolerance for quantity comparisons (matches the reference netting logic). */
export const EPSILON = 0.000001;

/** Trading fee rate charged on `price × quantity` (server rule). */
export const FEE_RATE = 0.0005;

export interface Bounds {
  readonly min: number;
  readonly max: number;
}

/** Leverage the order form lets the user pick. */
export const UI_LEVERAGE: Bounds = { min: 1, max: 10 };

/** Leverage the server accepts. */
export const SERVER_LEVERAGE: Bounds = { min: 1, max: 100 };

/**
 * Rounds half away from zero. Shifting the exponent through the string form
 * avoids binary drift such as `1.005 * 100 === 100.49999…`.
 */
export function roundTo(value: number, digits: number): number {
  if (!Number.isFinite(value)) return value;
  const sign = value < 0 ? -1 : 1;
  const shifted = Math.round(Number(`${Math.abs(value)}e${digits}`));
  return sign * Number(`${shifted}e-${digits}`);
}

export const round2 = (value: number) => roundTo(value, 2);
export const round4 = (value: number) => roundTo(value, 4);
export const round6 = (value: number) => roundTo(value, 6);

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const clamp01 = (value: number) => clamp(value, 0, 1);

/** Position/order direction. A "No" order on a multi-outcome option is `short`. */
export type Side = "long" | "short";

/** Order-form direction as submitted to the server. */
export type OrderSide = "buy" | "sell";

export const toSide = (orderSide: OrderSide): Side => (orderSide === "buy" ? "long" : "short");

/** Price of the complementary outcome, in its own price space. */
export const mirrorPrice = (price: number) => round4(clamp01(1 - price));

/**
 * Price a side trades at, given the option's (Yes) price. Every position lives
 * in its own side's price space: long at `p`, short at `1 − p`.
 */
export const sidePrice = (optionPrice: number, side: Side) =>
  side === "long" ? round4(optionPrice) : mirrorPrice(optionPrice);

/** Outcome prices are probabilities strictly between 0 and 1. */
export const isValidPrice = (price: number) => Number.isFinite(price) && price > 0 && price < 1;

export const isValidLeverage = (leverage: number, bounds: Bounds) =>
  Number.isInteger(leverage) && leverage >= bounds.min && leverage <= bounds.max;

/** Orders are sized in whole contracts. */
export const isContractQuantity = (quantity: number) => Number.isInteger(quantity) && quantity > 0;

export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
