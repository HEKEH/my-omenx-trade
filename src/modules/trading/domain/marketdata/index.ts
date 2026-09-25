import { mirrorPrice, round2, roundTo } from "../shared";

export interface BookLevel {
  price: number;
  amount: number;
}

export interface AggregatedLevel extends BookLevel {
  /** Cumulative amount from the best price down to this level. */
  total: number;
}

export interface OrderBook<T extends BookLevel = BookLevel> {
  asks: T[];
  bids: T[];
}

export type BookSide = "bid" | "ask";

/** Tolerance so a price already on a step boundary stays in that bucket. */
const BUCKET_EPSILON = 1e-9;

export const stepDecimals = (step: number) => (step < 1 ? Math.abs(Math.floor(Math.log10(step))) : 0);

export const withCumulativeTotals = (levels: readonly BookLevel[]): AggregatedLevel[] => {
  let total = 0;
  return levels.map((level) => {
    total += level.amount;
    return { ...level, total };
  });
};

/**
 * Groups levels into price buckets of `step`. Bids round down and asks round
 * up (so a bucket never looks better than its orders); both come back best
 * price first, with cumulative totals.
 */
export const aggregateOrderBook = (levels: readonly BookLevel[], step: number, side: BookSide): AggregatedLevel[] => {
  const decimals = stepDecimals(step);
  const buckets = new Map<number, number>();
  for (const level of levels) {
    const ratio = level.price / step;
    const bucket = side === "bid" ? Math.floor(ratio + BUCKET_EPSILON) : Math.ceil(ratio - BUCKET_EPSILON);
    const price = roundTo(bucket * step, decimals);
    buckets.set(price, (buckets.get(price) ?? 0) + level.amount);
  }
  const sorted = [...buckets.entries()]
    .map(([price, amount]) => ({ price, amount }))
    .sort((a, b) => (side === "bid" ? b.price - a.price : a.price - b.price));
  return withCumulativeTotals(sorted);
};

/**
 * The book seen from the No side: prices become `1 − p`, so the Yes bids
 * (buyers of Yes) are sellers of No and turn into asks, and vice versa.
 */
export const mirrorOrderBook = <T extends BookLevel>(book: OrderBook<T>): OrderBook<T> => ({
  asks: book.bids.map((level) => ({ ...level, price: mirrorPrice(level.price) })),
  bids: book.asks.map((level) => ({ ...level, price: mirrorPrice(level.price) })),
});

/** The book as the order side sees it: as is for Yes (buy), mirrored for No (sell). */
export const bookForSide = <T extends BookLevel>(book: OrderBook<T>, side: "buy" | "sell"): OrderBook<T> =>
  side === "sell" ? mirrorOrderBook(book) : book;

/** Width of a depth bar, in percent of the deepest level. */
export const depthPercent = (total: number, maxTotal: number) => (maxTotal > 0 ? (total / maxTotal) * 100 : 0);

/** Adds each row's depth bar width, scaled to the largest total in the list. */
export const withDepth = <T extends { total: number }>(rows: readonly T[]): (T & { depth: number })[] => {
  const max = Math.max(0, ...rows.map((row) => row.total));
  return rows.map((row) => ({ ...row, depth: depthPercent(row.total, max) }));
};

export const priceChangePercent = (current: number, base: number) =>
  base > 0 ? round2(((current - base) / base) * 100) : 0;
