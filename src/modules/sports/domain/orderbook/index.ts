/** A resting level: price in ¢ and size in contracts. */
export interface BookLevel {
  price: number;
  size: number;
}

export interface BookRow extends BookLevel {
  /** Cumulative size from the level nearest the spread. */
  total: number;
  /** Size relative to the largest level of the same half, in percent. */
  depthPct: number;
}

export interface BookSide {
  /** High → low; the best ask is the last row. */
  asks: BookRow[];
  /** High → low; the best bid is the first row. */
  bids: BookRow[];
  last: number;
  spread: number;
}

/** The reference's fixed YES levels (OrderBook.tsx:30-46). */
export const DEFAULT_YES_BIDS: BookLevel[] = [
  { price: 27, size: 1240 },
  { price: 26, size: 880 },
  { price: 25, size: 2030 },
  { price: 24, size: 410 },
  { price: 23, size: 615 },
  { price: 22, size: 1900 },
];

export const DEFAULT_YES_ASKS: BookLevel[] = [
  { price: 29, size: 1450 },
  { price: 30, size: 720 },
  { price: 31, size: 1980 },
  { price: 32, size: 540 },
  { price: 33, size: 880 },
  { price: 34, size: 1610 },
];

const byPriceDesc = (a: BookLevel, b: BookLevel) => b.price - a.price;

/** Asks sum bottom-up (best ask at the bottom), bids top-down (best bid at the top). */
function withDepth(levels: BookLevel[], tone: "ask" | "bid"): BookRow[] {
  const max = Math.max(...levels.map((r) => r.size));
  const totals = new Array<number>(levels.length);
  let acc = 0;
  if (tone === "bid") levels.forEach((r, i) => (totals[i] = acc += r.size));
  else for (let i = levels.length - 1; i >= 0; i--) totals[i] = acc += levels[i].size;
  return levels.map((r, i) => ({ ...r, total: totals[i], depthPct: (r.size / max) * 100 }));
}

/**
 * Both books of a YES/NO market (reference OrderBook.tsx:151-203). The NO book mirrors the
 * YES book: a YES ask at p is a NO bid at 100 − p and vice versa. Levels are the reference's
 * fixed defaults unless given; the mark only sets Last.
 */
export function buildOrderBook({
  mark,
  yesBids = DEFAULT_YES_BIDS,
  yesAsks = DEFAULT_YES_ASKS,
}: {
  mark: number;
  yesBids?: BookLevel[];
  yesAsks?: BookLevel[];
}): { yes: BookSide; no: BookSide } {
  const yBids = [...yesBids].sort(byPriceDesc);
  const yAsks = [...yesAsks].sort(byPriceDesc);
  const nBids = yAsks.map((r) => ({ price: 100 - r.price, size: r.size })).sort(byPriceDesc);
  const nAsks = yBids.map((r) => ({ price: 100 - r.price, size: r.size })).sort(byPriceDesc);

  const ySpread = Math.max(0, (yAsks.at(-1)?.price ?? mark) - (yBids[0]?.price ?? mark));
  const nSpread = Math.max(0, (nAsks.at(-1)?.price ?? 100 - mark) - (nBids[0]?.price ?? 100 - mark));
  return {
    yes: { asks: withDepth(yAsks, "ask"), bids: withDepth(yBids, "bid"), last: mark, spread: ySpread },
    no: { asks: withDepth(nAsks, "ask"), bids: withDepth(nBids, "bid"), last: 100 - mark, spread: nSpread },
  };
}
