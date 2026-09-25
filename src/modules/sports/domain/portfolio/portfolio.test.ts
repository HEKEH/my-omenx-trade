import { describe, expect, it } from "vitest";
import { marketRepository } from "../../infrastructure/repositories";
import { positionLeagueKey } from "../market";
import type { PlacedOrder } from "../trade";
import { applyPlacedOrder, buildSeed, closePosition, livePositions, outcomeTag, positionsOnChart, roe } from ".";

const market = (id: string) => {
  const found = marketRepository.getById(id);
  if (!found) throw new Error(id);
  return found;
};
const live = market("wc26-usa-par");
const liveSeed = buildSeed(live, positionLeagueKey(live.league.short));

describe("seed rows (dev reference §5.9, event.$id.tsx:125-273)", () => {
  // Values from scripts/sports-visual/ref-goldens.ts (reference buildSeed).
  it("3-way market: three positions, two orders, three history rows from the first two outcomes", () => {
    expect(liveSeed.positions).toEqual([
      { market: "United States vs Paraguay", league: "epl", outcome: "yes", outcomeLabel: "USA", eventShape: "multi", size: 180, entry: 44, mark: 48, leverage: 3, mode: "cross", margin: 60, liq: 30, pnl: 0, tp: 62, sl: 36 },
      { market: "United States vs Paraguay", league: "epl", outcome: "no", outcomeLabel: "Draw", eventShape: "multi", size: 90, entry: 32, mark: 29, leverage: 1, mode: "isolated", margin: 27, liq: 99, pnl: 0, tp: null, sl: null },
      { market: "United States vs Paraguay", league: "epl", outcome: "yes", outcomeLabel: "USA", eventShape: "multi", size: 200, entry: 48, mark: 48, leverage: 5, mode: "isolated", margin: 10, liq: 28, pnl: 0, tp: null, sl: null, isAirdrop: true },
    ]);
    expect(liveSeed.orders).toEqual([
      { market: "United States vs Paraguay", league: "epl", outcome: "yes", outcomeLabel: "USA", eventShape: "multi", type: "limit", price: 42, size: 120, filled: 25 },
      { market: "United States vs Paraguay", league: "epl", outcome: "no", outcomeLabel: "Draw", eventShape: "multi", type: "limit", price: 25, size: 80, filled: 0 },
    ]);
    expect(liveSeed.history).toEqual([
      { market: "United States vs Paraguay", league: "epl", outcome: "yes", outcomeLabel: "USA", eventShape: "multi", action: "fill", price: 44, size: 180, when: "1h ago" },
      { market: "United States vs Paraguay", league: "epl", outcome: "no", outcomeLabel: "Draw", eventShape: "multi", action: "close", price: 34, size: 60, pnl: 8.4, when: "Yesterday" },
      { market: "United States vs Paraguay", league: "epl", outcome: "yes", outcomeLabel: "USA", eventShape: "multi", action: "close", price: 39, size: 75, pnl: -5.2, when: "2d ago" },
    ]);
  });

  it("binary market: team names as labels", () => {
    const binary = market("liv-new");
    const { positions } = buildSeed(binary, positionLeagueKey(binary.league.short));
    expect(positions.map((p) => [p.outcomeLabel, p.eventShape, p.entry, p.mark, p.liq, p.tp, p.sl])).toEqual([
      ["Liverpool", "binary", 59, 63, 45, 77, 51],
      ["Newcastle", "binary", 40, 37, 99, null, null],
      ["Liverpool", "binary", 63, 63, 43, null, null],
    ]);
  });
});

describe("live mark jitter and close (BUG-3, BUG-4)", () => {
  it("mark swings around entry, not the market price", () => {
    expect(livePositions(liveSeed.positions, 0).map((p) => [p.mark, p.pnl])).toEqual([
      [44, 0],
      [33, -0.27],
      [46.6, -0.7],
    ]);
    expect(livePositions(liveSeed.positions, 5).map((p) => [p.mark, p.pnl])).toEqual([
      [45.4, 2.51],
      [30.9, 0.29],
      [48.1, 0.04],
    ]);
  });

  it("closing rounds the mark first, so the realised PnL differs from the table's", () => {
    const closed = closePosition(liveSeed.positions[1], 1, 5);
    expect(closed).toEqual({
      mark: 31,
      pnl: 0.27,
      history: { market: "United States vs Paraguay", league: "epl", outcome: "no", outcomeLabel: "Draw", eventShape: "multi", action: "close", price: 31, size: 90, pnl: 0.27, when: "Just now" },
    });
    expect(closePosition(liveSeed.positions[0], 0, 5)).toMatchObject({ mark: 45, pnl: 1.8 });
  });

  it("multiplies by notional (margin × leverage) in the reference's order, which matters for decimal margins", () => {
    const row = { ...liveSeed.positions[1], outcome: "no" as const, entry: 3, margin: 3.3, leverage: 5 };
    // Reference: (0.04 − 0.03) × 16.5 × −1 × 100 = −16.500000000000004 → −0.17.
    expect(closePosition(row, 1, 0)).toMatchObject({ mark: 4, pnl: -0.17 });
  });

  it("ROE is PnL over margin, 0 without margin", () => {
    expect(roe(1.8, 60)).toBeCloseTo(3, 12);
    expect(roe(5, 0)).toBe(0);
  });
});

describe("placing an order (BUG-5, event.$id.tsx:511-552)", () => {
  const order = (over: Partial<PlacedOrder>): PlacedOrder => ({
    side: "buy",
    type: "market",
    outcome: "yes",
    outcomeLabel: "USA YES",
    price: 48,
    margin: 100,
    leverage: 1,
    notional: 100,
    shares: 208.33,
    fee: 0.2,
    liq: 0,
    tp: null,
    sl: null,
    label: "Buy USA YES @ 48¢",
    ...over,
  });
  const context = { market: live, league: "epl" as const, currentPx: 48 };

  it("a limit buy away from the YES price rests as an order", () => {
    expect(applyPlacedOrder({ ...context, order: order({ type: "limit", price: 40 }) })).toEqual({
      kind: "order",
      row: { market: "United States vs Paraguay", league: "epl", outcome: "yes", outcomeLabel: "USA YES", eventShape: "multi", type: "limit", price: 40, size: 208, filled: 0 },
    });
  });

  it("a NO limit buy at the NO price still rests, because it is compared with the YES price", () => {
    expect(applyPlacedOrder({ ...context, order: order({ type: "limit", outcome: "no", price: 52 }) }).kind).toBe("order");
  });

  it("market orders, limit orders at the YES price and sells open a position", () => {
    for (const placed of [order({}), order({ type: "limit", price: 48 }), order({ side: "sell", type: "limit", price: 40 })]) {
      const result = applyPlacedOrder({ ...context, order: placed });
      expect(result.kind).toBe("position");
    }
    expect(applyPlacedOrder({ ...context, order: order({ leverage: 3, margin: 50, liq: 20, tp: 60, sl: 30 }) })).toEqual({
      kind: "position",
      row: { market: "United States vs Paraguay", league: "epl", outcome: "yes", outcomeLabel: "USA YES", eventShape: "multi", size: 208, entry: 48, mark: 48, leverage: 3, mode: "cross", margin: 50, liq: 20, pnl: 0, tp: 60, sl: 30 },
    });
  });
});

describe("outcome tags (PositionsTable.tsx:423-454)", () => {
  it("multi-outcome aliases get a YES/NO suffix; neutral labels do not", () => {
    expect(outcomeTag("USA", "multi")).toEqual({ text: "USA", suffix: true });
    expect(outcomeTag("Draw", "multi")).toEqual({ text: "DRAW", suffix: true });
    expect(outcomeTag("yes", "multi")).toEqual({ text: "Yes", suffix: false });
    expect(outcomeTag("Liverpool", "binary")).toEqual({ text: "Liverpool", suffix: false });
    expect(outcomeTag("NO", undefined)).toEqual({ text: "No", suffix: false });
  });
});

describe("positions on the chart (event.$id.tsx:429-447)", () => {
  it("matches seeded rows to outcomes by team name or label and keeps the row index", () => {
    const rows = livePositions(liveSeed.positions, 0);
    expect(positionsOnChart(rows, live)).toEqual([
      { index: 0, outcomeId: "h", side: "yes", entry: 44, pnl: 0, size: 180, outcomeLabel: "USA" },
      { index: 1, outcomeId: "d", side: "no", entry: 32, pnl: -0.27, size: 90, outcomeLabel: "Draw" },
      { index: 2, outcomeId: "h", side: "yes", entry: 48, pnl: -0.7, size: 200, outcomeLabel: "USA" },
    ]);
  });

  it("skips rows whose label matches no outcome", () => {
    const rows = livePositions(liveSeed.positions, 0).map((p) => ({ ...p, outcomeLabel: "USA YES" }));
    expect(positionsOnChart(rows, live)).toEqual([]);
  });
});
