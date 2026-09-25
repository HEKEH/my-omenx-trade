import { describe, expect, it } from "vitest";
import { marketRepository } from "../../infrastructure/repositories";
import { CHART_RANGES, chartOverlay, genSeries, hashSeed, priceSeries } from ".";

const live = marketRepository.getById("wc26-usa-par")!;

// Values from scripts/sports-visual/ref-goldens.ts (reference hashSeed / genSeries).
const golden = {
  h: { seeds: [92, 105, 118, 131, 144], first: [49.72, 51.28, 52.76, 54.11, 55.21], last: [56.11, 58.01, 48], sum: 3281.2 },
  d: { seeds: [96, 109, 122, 135, 148], first: [41.9, 43.1, 45.73, 46.15, 47.73], last: [45.59, 46.38, 29], sum: 2617.58 },
  a: { seeds: [99, 112, 125, 138, 151], first: [16.92, 19, 20.16, 20.38, 19.7], last: [15.96, 15.78, 25], sum: 1005.15 },
};

describe("price history series (dev reference §5.5)", () => {
  it("ranges in order, 1D by default at index 2", () => {
    expect(CHART_RANGES).toEqual(["1H", "6H", "1D", "1W", "ALL"]);
  });

  it("seeds per market:outcome, bumped by 13 per range", () => {
    for (const o of live.outcomes) {
      const g = golden[o.id as keyof typeof golden];
      expect(hashSeed(`${live.id}:${o.id}`)).toBe(g.seeds[0]);
    }
  });

  it("60 points ending at the current price", () => {
    for (const o of live.outcomes) {
      const g = golden[o.id as keyof typeof golden];
      const values = genSeries(g.seeds[2], o.price);
      expect(values).toHaveLength(60);
      expect(values.slice(0, 5)).toEqual(g.first);
      expect(values.slice(-3)).toEqual(g.last);
      expect(Number(values.reduce((a, b) => a + b, 0).toFixed(2))).toBe(g.sum);
    }
  });

  it("priceSeries labels by team alias and uses the range's seed", () => {
    const series = priceSeries(live, "1D");
    expect(series.map((s) => [s.id, s.label, s.values.at(-1)])).toEqual([
      ["h", "USA", 48],
      ["d", "Draw", 29],
      ["a", "PAR", 25],
    ]);
    expect(series[0].values.slice(0, 5)).toEqual(golden.h.first);
    expect(priceSeries(live, "1H")[0].values).toEqual(genSeries(golden.h.seeds[0], 0.48));
  });
});

describe("chart position overlay (CombinedPriceChart.tsx:134-149)", () => {
  it("plots NO entries on the YES axis, top-down, dropping unknown outcomes", () => {
    const rows = chartOverlay(
      [
        { index: 0, outcomeId: "h", side: "yes", entry: 44, pnl: 0, size: 180, outcomeLabel: "USA" },
        { index: 1, outcomeId: "d", side: "no", entry: 32, pnl: -0.27, size: 90, outcomeLabel: "Draw" },
        { index: 2, outcomeId: "zz", side: "yes", entry: 50, pnl: 0, size: 1, outcomeLabel: "?" },
      ],
      live,
    );
    expect(rows.map((r) => [r.outcomeId, r.outcomeIndex, r.yChart])).toEqual([
      ["d", 1, 68],
      ["h", 0, 44],
    ]);
  });
});
