import { round6, type Side } from "../shared";

const MAX_HOURLY_RATE = 0.0002;
const HOUR_MS = 3_600_000;

/** How often funding is refreshed and accrued. */
export const FUNDING_INTERVAL_MS = 5 * 60_000;

/**
 * When funding next accrues, in epoch ms: the server's schedule if it has one,
 * otherwise one interval after the last accrual; `null` when neither is known.
 */
export const nextAccrualAt = (nextFundingAt: string | null, lastFundingAt: string | null): number | null => {
  if (nextFundingAt) return new Date(nextFundingAt).getTime();
  if (lastFundingAt) return new Date(lastFundingAt).getTime() + FUNDING_INTERVAL_MS;
  return null;
};

export const hoursBetween = (from: string | Date, to: Date) =>
  (to.getTime() - new Date(from).getTime()) / HOUR_MS;

/**
 * Funding owed for a period: `sign × rate × size × mark × hours`, 6 decimals.
 * Longs pay a positive rate and shorts receive it. Returns 0 when nothing
 * accrues; callers then leave the accrual timestamp alone so it catches up.
 */
export const accrueFunding = ({
  side,
  ratePerHour,
  size,
  markPrice,
  hours,
}: {
  side: Side;
  ratePerHour: number;
  size: number;
  markPrice: number;
  hours: number;
}) => {
  if (hours <= 0 || ratePerHour === 0) return 0;
  const sign = side === "long" ? 1 : -1;
  const amount = round6(sign * ratePerHour * size * markPrice * hours);
  return amount === 0 ? 0 : amount;
};

/** Funding per hour at the current notional; positive means the user pays. */
export const fundingPerHour = ({
  side,
  ratePerHour,
  notional,
}: {
  side: Side;
  ratePerHour: number;
  notional: number;
}) => {
  const signedRate = (side === "long" ? 1 : -1) * ratePerHour;
  return { amount: signedRate * notional, userPays: signedRate > 0 };
};

/** A new hourly rate in [−0.0002, 0.0002]. `random` returns a value in [0, 1]. */
export const randomFundingRate = (random: () => number) => {
  const rate = round6((random() - 0.5) * 2 * MAX_HOURLY_RATE);
  return rate === 0 ? 0 : rate;
};
