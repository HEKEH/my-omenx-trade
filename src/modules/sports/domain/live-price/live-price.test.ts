import { describe, expect, it } from "vitest";
import {
  buildCandles,
  CANDLE_INTERVAL_SECONDS,
  CANDLE_WINDOW,
  createLiveSim,
  simulateUntil,
  trimTrades,
  type LiveTrade,
} from ".";

const T0 = 1_790_000_000_000;

const run = (live: boolean, seconds: number, seedKey = "wc26-usa-par:h") => {
  const sim = createLiveSim({ seedKey, basePrice: 48, live, startMs: T0 });
  return simulateUntil(sim, T0 + seconds * 1000);
};

describe("simulated trades", () => {
  it("is deterministic for the same key and time", () => {
    expect(run(true, 120).trades).toEqual(run(true, 120).trades);
    expect(run(true, 120, "wc26-usa-par:a").trades).not.toEqual(run(true, 120).trades);
  });

  it("gives the same trades whether simulated in one go or in steps", () => {
    const whole = run(true, 60).trades;
    const sim = createLiveSim({ seedKey: "wc26-usa-par:h", basePrice: 48, live: true, startMs: T0 });
    const first = simulateUntil(sim, T0 + 25_000);
    const second = simulateUntil(first.sim, T0 + 60_000);
    expect([...first.trades, ...second.trades]).toEqual(whole);
  });

  it("keeps prices on the 0.1¢ grid inside 1–99¢, in time order", () => {
    const { trades } = run(true, 3600);
    for (const [i, t] of trades.entries()) {
      expect(t.price).toBeGreaterThanOrEqual(1);
      expect(t.price).toBeLessThanOrEqual(99);
      expect(Math.round(t.price * 10) / 10).toBe(t.price);
      expect(t.size).toBeGreaterThan(0);
      if (i > 0) expect(t.t).toBeGreaterThanOrEqual(trades[i - 1].t);
    }
  });

  it("trades sparsely: live about one a second, pre-match far fewer", () => {
    const live = run(true, 3600).trades.length / 3600;
    const pre = run(false, 3600).trades.length / 3600;
    expect(live).toBeGreaterThan(0.6);
    expect(live).toBeLessThan(3);
    expect(pre).toBeLessThan(live / 2);
  });

  it("stays near the displayed price: pre-match within 3¢, live within 12¢", () => {
    for (const [live, band] of [[false, 3], [true, 12]] as const) {
      for (const t of run(live, 3600).trades) expect(Math.abs(t.price - 48)).toBeLessThanOrEqual(band);
    }
  });

  it("jumps only in live markets (a move of 2.5¢+ within two seconds)", () => {
    const jumps = (trades: LiveTrade[]) =>
      trades.filter((t, i) => trades.slice(0, i).some((p) => t.t - p.t <= 2000 && Math.abs(t.price - p.price) >= 2.5)).length;
    expect(jumps(run(true, 3600).trades)).toBeGreaterThan(0);
    expect(jumps(run(false, 3600).trades)).toBe(0);
  });

  it("drops trades older than the longest window", () => {
    const { trades } = run(true, 3 * 3600);
    const end = T0 + 3 * 3600 * 1000;
    const kept = trimTrades(trades, end);
    expect(kept[0].t).toBeGreaterThanOrEqual(end - CANDLE_WINDOW * 60_000 - 60_000);
    expect(kept.at(-1)).toEqual(trades.at(-1));
  });
});

describe("candles", () => {
  const trade = (sec: number, price: number, size = 10): LiveTrade => ({ t: T0 + sec * 1000, price, size });

  // Each candle opens at the previous close, so sparse trading leaves no gaps between candles.
  it("turns trades into OHLC and volume per interval", () => {
    const trades = [trade(0.2, 48), trade(0.5, 48.3), trade(0.9, 47.8), trade(1.1, 48.1, 5)];
    const candles = buildCandles(trades, { intervalSec: 1, endMs: T0 + 1500, count: 2, fallbackPrice: 48 });
    expect(candles).toEqual([
      { time: T0 / 1000, open: 48, high: 48.3, low: 47.8, close: 47.8, volume: 30 },
      { time: T0 / 1000 + 1, open: 47.8, high: 48.1, low: 47.8, close: 48.1, volume: 5 },
    ]);
  });

  it("fills intervals without trades flat at the last close, with no volume", () => {
    const candles = buildCandles([trade(0.5, 50)], { intervalSec: 1, endMs: T0 + 3500, count: 4, fallbackPrice: 48 });
    expect(candles.map((c) => [c.open, c.close, c.volume])).toEqual([
      [48, 50, 10],
      [50, 50, 0],
      [50, 50, 0],
      [50, 50, 0],
    ]);
  });

  it("opens at the previous close and uses the last trade before the window for empty leading candles", () => {
    const trades = [trade(-10, 46), trade(1.5, 47)];
    const candles = buildCandles(trades, { intervalSec: 1, endMs: T0 + 1500, count: 2, fallbackPrice: 48 });
    expect(candles[0]).toMatchObject({ open: 46, close: 46, volume: 0 });
    expect(candles[1]).toMatchObject({ open: 46, high: 47, low: 46, close: 47 });
  });

  it("falls back to the given price when no trade exists yet", () => {
    const [c] = buildCandles([], { intervalSec: 5, endMs: T0, count: 1, fallbackPrice: 48 });
    expect(c).toMatchObject({ open: 48, high: 48, low: 48, close: 48, volume: 0 });
  });

  it("aligns buckets to the interval and returns the requested count", () => {
    const { trades } = run(true, 600);
    for (const [key, sec] of Object.entries(CANDLE_INTERVAL_SECONDS)) {
      const candles = buildCandles(trades, { intervalSec: sec, endMs: T0 + 600_000, count: 30, fallbackPrice: 48 });
      expect(candles, key).toHaveLength(30);
      for (const [i, c] of candles.entries()) {
        expect(c.time % sec).toBe(0);
        if (i > 0) expect(c.time - candles[i - 1].time).toBe(sec);
        expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
        expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
      }
    }
  });

  it("1s candles are mostly flat while 1m candles have range", () => {
    const { trades } = run(true, 3600);
    const flatShare = (sec: number) => {
      const candles = buildCandles(trades, { intervalSec: sec, endMs: T0 + 3600_000, count: 60, fallbackPrice: 48 });
      return candles.filter((c) => c.high === c.low).length / candles.length;
    };
    expect(flatShare(1)).toBeGreaterThan(0.4);
    expect(flatShare(60)).toBeLessThan(0.1);
  });
});
