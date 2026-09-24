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

/** Moves the decimal point by adjusting the exponent of the number's string form. */
const shiftExponent = (value: number, by: number) => {
  const [mantissa, exponent = "0"] = String(value).split("e");
  return Number(`${mantissa}e${Number(exponent) + by}`);
};

/**
 * Rounds half away from zero. Shifting through the string form avoids binary
 * drift such as `1.005 * 100 === 100.49999…`; the exponent is adjusted rather
 * than appended so values already printed as `5e-10` stay parseable.
 */
export function roundTo(value: number, digits: number): number {
  if (!Number.isFinite(value)) return value;
  const sign = value < 0 ? -1 : 1;
  const shifted = Math.round(shiftExponent(Math.abs(value), digits));
  return sign * shiftExponent(shifted, -digits);
}

/** A decimal as an integer count of `10^-digits` units, e.g. 0.2891 → 2891. */
export const toUnits = (value: number, digits: number) => Math.round(shiftExponent(value, digits));

/**
 * `numerator / denominator` rounded half away from zero, for integers. Money
 * math goes through integer units so halves round like the server's exact
 * decimals (floating point puts 0.35 / 0.1 at 3.4999…).
 */
export const divRoundHalfUp = (numerator: number, denominator: number): number => {
  if (numerator < 0) return -divRoundHalfUp(-numerator, denominator);
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
};

/** `price × quantity` in 1e-4 USDC units (prices carry four decimals). */
export const notionalUnits = (price: number, quantity: number) => toUnits(price, 4) * quantity;

/** Fee rate in basis points (1e-4), as an integer. */
const FEE_BPS = toUnits(FEE_RATE, 4);

/**
 * Fee on `price × quantity`, rounded to cents exactly as the server does:
 * cents = notional units × bps / 1e6.
 */
export const feeFor = (price: number, quantity: number) =>
  divRoundHalfUp(notionalUnits(price, quantity) * FEE_BPS, 1e6) / 100;

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
