import { cents, type PositionLeagueKey, type SportsMarket } from "../market";
import type { PlacedOrder, YesNo } from "../trade";

/**
 * "binary": 2-outcome event, each outcome is a side (the tag shows just the alias).
 * "multi": 3+ outcomes, each its own YES/NO sub-market (the tag shows `ALIAS YES|NO`).
 */
export type EventShape = "binary" | "multi";

/** Rows of the positions table (reference PositionsTable.tsx:42-98). Prices in ¢. */
export interface PositionRow {
  market: string;
  league: PositionLeagueKey;
  /** All positions are long YES or long NO. */
  outcome: YesNo;
  outcomeLabel: string;
  eventShape?: EventShape;
  size: number;
  entry: number;
  mark: number;
  leverage: number;
  mode: "cross" | "isolated";
  margin: number;
  liq: number;
  pnl: number;
  tp?: number | null;
  sl?: number | null;
  /** Voucher position: AIRDROP badge, TP/SL locked. */
  isAirdrop?: boolean;
}

export interface OrderRow {
  market: string;
  league: PositionLeagueKey;
  outcome: YesNo;
  outcomeLabel: string;
  eventShape?: EventShape;
  type: "limit" | "market";
  price: number;
  size: number;
  /** Filled share in percent. */
  filled: number;
}

export interface HistoryRow {
  market: string;
  league: PositionLeagueKey;
  outcome: YesNo;
  outcomeLabel: string;
  eventShape?: EventShape;
  action: "open" | "close" | "fill";
  price: number;
  size: number;
  /** Only on closes. */
  pnl?: number;
  when: string;
}

export interface PortfolioSeed {
  positions: PositionRow[];
  orders: OrderRow[];
  history: HistoryRow[];
}

export const clampPct = (v: number) => Math.max(1, Math.min(99, v));

/**
 * Rows every visitor sees on first load, derived from the market's first two outcomes so
 * the same market always seeds the same rows (reference event.$id.tsx:125-273).
 */
export function buildSeed(market: SportsMarket, league: PositionLeagueKey): PortfolioSeed {
  const first = market.outcomes[0];
  const second = market.outcomes[1] ?? market.outcomes[0];
  const firstPx = cents(first.price);
  const secondPx = cents(second.price);
  const eventShape: EventShape = market.outcomes.length === 2 ? "binary" : "multi";
  // Binary rows name the team; multi rows use the outcome's short label ("CAN").
  const firstLabel = eventShape === "binary" ? (first.team?.name ?? first.label) : first.label;
  const secondLabel = eventShape === "binary" ? (second.team?.name ?? second.label) : second.label;
  const liqYes = clampPct(firstPx - 18);
  const base = { market: market.title, league, eventShape };
  const firstSide = { ...base, outcome: "yes" as const, outcomeLabel: firstLabel };
  const secondSide = { ...base, outcome: "no" as const, outcomeLabel: secondLabel };

  return {
    positions: [
      // TP/SL pre-set so the column shows a populated state.
      { ...firstSide, size: 180, entry: clampPct(firstPx - 4), mark: firstPx, leverage: 3, mode: "cross", margin: 60, liq: liqYes, pnl: 0, tp: clampPct(firstPx + 14), sl: clampPct(Math.max(liqYes + 3, firstPx - 12)) },
      { ...secondSide, size: 90, entry: clampPct(secondPx + 3), mark: secondPx, leverage: 1, mode: "isolated", margin: 27, liq: 99, pnl: 0, tp: null, sl: null },
      // Airdrop / voucher position: no TP/SL.
      { ...firstSide, size: 200, entry: firstPx, mark: firstPx, leverage: 5, mode: "isolated", margin: 10, liq: clampPct(firstPx - 20), pnl: 0, tp: null, sl: null, isAirdrop: true },
    ],
    orders: [
      { ...firstSide, type: "limit", price: clampPct(firstPx - 6), size: 120, filled: 25 },
      { ...secondSide, type: "limit", price: clampPct(secondPx - 4), size: 80, filled: 0 },
    ],
    history: [
      { ...firstSide, action: "fill", price: clampPct(firstPx - 4), size: 180, when: "1h ago" },
      { ...secondSide, action: "close", price: clampPct(secondPx + 5), size: 60, pnl: 8.4, when: "Yesterday" },
      { ...firstSide, action: "close", price: clampPct(firstPx - 9), size: 75, pnl: -5.2, when: "2d ago" },
    ],
  };
}

/** Mark offset for row `index` at `tick` (one tick per second). */
const markJitter = (tick: number, index: number) => Math.sin((tick + index * 7) / 3) * 1.4;

// Notional first, as on the reference: the multiplication order changes the rounding for
// decimal margins.
const unrealisedPnl = (row: PositionRow, mark: number) => {
  const notional = row.margin * row.leverage;
  return (mark / 100 - row.entry / 100) * notional * (row.outcome === "yes" ? 1 : -1);
};

/**
 * Positions with a live mark that swings around each row's entry, not the market price
 * (dev reference BUG-3, event.$id.tsx:354-363). Mark to 0.1¢, PnL to the cent.
 */
export function livePositions(positions: readonly PositionRow[], tick: number): PositionRow[] {
  return positions.map((row, i) => {
    const mark = clampPct(row.entry + markJitter(tick, i));
    return { ...row, mark: Math.round(mark * 10) / 10, pnl: Math.round(unrealisedPnl(row, mark) * 100) / 100 };
  });
}

/**
 * Closing row `index` at `tick`: the mark is rounded to a whole cent before the PnL, so the
 * realised PnL can differ from the table's (dev reference BUG-4, event.$id.tsx:365-398).
 */
export function closePosition(row: PositionRow, index: number, tick: number): { mark: number; pnl: number; history: HistoryRow } {
  const mark = Math.round(clampPct(row.entry + markJitter(tick, index)));
  const pnl = Math.round(unrealisedPnl(row, mark) * 100) / 100;
  return {
    mark,
    pnl,
    history: {
      market: row.market,
      league: row.league,
      outcome: row.outcome,
      outcomeLabel: row.outcomeLabel,
      eventShape: row.eventShape,
      action: "close",
      price: mark,
      size: row.size,
      pnl,
      when: "Just now",
    },
  };
}

/** Return on margin in percent. */
export const roe = (pnl: number, margin: number) => (margin > 0 ? (pnl / margin) * 100 : 0);

/**
 * Where a placed order lands (reference event.$id.tsx:511-552). Only a limit BUY away from
 * `currentPx` (the selected outcome's YES price, also for NO orders) rests as an order;
 * everything else, sells included, opens a position (dev reference BUG-5).
 */
export function applyPlacedOrder({
  order,
  market,
  league,
  currentPx,
}: {
  order: PlacedOrder;
  market: SportsMarket;
  league: PositionLeagueKey;
  currentPx: number;
}): { kind: "order"; row: OrderRow } | { kind: "position"; row: PositionRow } {
  const base = {
    market: market.title,
    league,
    outcome: order.outcome,
    outcomeLabel: order.outcomeLabel,
    eventShape: (market.outcomes.length === 2 ? "binary" : "multi") as EventShape,
  };
  if (order.type === "limit" && order.side === "buy" && order.price !== currentPx) {
    return { kind: "order", row: { ...base, type: "limit", price: order.price, size: Math.round(order.shares), filled: 0 } };
  }
  return {
    kind: "position",
    row: {
      ...base,
      size: Math.round(order.shares),
      entry: order.price,
      mark: order.price,
      leverage: order.leverage,
      mode: "cross",
      margin: order.margin,
      liq: order.liq,
      pnl: 0,
      tp: order.tp,
      sl: order.sl,
    },
  };
}

/**
 * The outcome tag text: multi-outcome aliases are upper-cased and followed by a YES/NO
 * suffix; literal "yes"/"no" labels are capitalised and never get one (PositionsTable.tsx:423-454).
 */
export function outcomeTag(label: string, eventShape: EventShape = "binary"): { text: string; suffix: boolean } {
  const neutral = label.toLowerCase() === "yes" || label.toLowerCase() === "no";
  const display = neutral ? label.charAt(0).toUpperCase() + label.slice(1).toLowerCase() : label;
  const suffix = eventShape === "multi" && !neutral;
  return { text: suffix ? display.toUpperCase() : display, suffix };
}

/** One open position drawn on the price chart. */
export interface ChartPosition {
  /** Index in the positions list, used to close it from the chart. */
  index: number;
  outcomeId: string;
  side: YesNo;
  entry: number;
  pnl: number;
  size: number;
  /** Alias shown in the chip, e.g. "USA". */
  outcomeLabel: string;
}

/**
 * Positions matched to this market's outcomes by team name or label (event.$id.tsx:429-447).
 * Positions placed from a 3+ outcome form carry "USA YES" and match nothing, so they are not
 * drawn (dev reference BUG-9).
 */
export function positionsOnChart(rows: readonly PositionRow[], market: SportsMarket): ChartPosition[] {
  const out: ChartPosition[] = [];
  rows.forEach((row, index) => {
    const matched = market.outcomes.find((o) => (o.team?.name ?? "") === row.outcomeLabel || o.label === row.outcomeLabel);
    if (!matched) return;
    out.push({
      index,
      outcomeId: matched.id,
      side: row.outcome,
      entry: row.entry,
      pnl: row.pnl,
      size: row.size,
      outcomeLabel: matched.team?.short ?? matched.label,
    });
  });
  return out;
}
