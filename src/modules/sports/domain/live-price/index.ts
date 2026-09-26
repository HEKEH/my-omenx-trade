/**
 * Simulated live trading for the event page's candle chart (dev reference §11, not on the
 * reference). Prices only change when a trade prints, so most seconds have none; live
 * matches also see rare jumps (a goal, a red card) with a burst of trades after them.
 * Nothing else on the page moves, so the walk stays near the outcome's displayed price.
 * All prices are in ¢ on a 0.1¢ grid.
 */

export const CANDLE_INTERVALS = ["1s", "5s", "15s", "1m"] as const;
export type CandleInterval = (typeof CANDLE_INTERVALS)[number];
export const CANDLE_INTERVAL_SECONDS: Record<CandleInterval, number> = { "1s": 1, "5s": 5, "15s": 15, "1m": 60 };
/** 1s candles are mostly flat (a trade a second at most), so the chart opens on 15s. */
export const DEFAULT_CANDLE_INTERVAL: CandleInterval = "15s";
/** Candles on screen at first; the chart can scroll back through what it has seen since. */
export const CANDLE_WINDOW = 120;
/** How often the page advances the simulation and redraws the forming candle. */
export const LIVE_SIM_STEP_MS = 250;

export interface LiveTrade {
  /** Epoch ms. */
  t: number;
  price: number;
  size: number;
}

export interface Candle {
  /** Bucket start, epoch seconds. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LiveSim {
  live: boolean;
  basePrice: number;
  price: number;
  /** Where the walk is pulled to: the base, or near the level of the last jump. */
  anchor: number;
  /** Time of the next trade, epoch ms. */
  nextAt: number;
  lastAt: number;
  burstUntil: number;
  jumpTarget: number | null;
  rng: number;
}

// Trades a second, outside and during the burst that follows a jump.
const LIVE_RATE = 1.1;
const PRE_MATCH_RATE = 0.2;
const BURST_FACTOR = 6;
const BURST_MS = 6000;
/** Mean seconds between jumps in a live match. */
const JUMP_EVERY_SEC = 300;
const MAX_DEVIATION = { live: 12, preMatch: 3 };
const ANCHOR_HALF_LIFE_MS = 120_000;

const round1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function hashKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** mulberry32: returns the next state and a number in [0, 1). */
function nextRandom(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [s, ((t ^ (t >>> 14)) >>> 0) / 4294967296];
}

/** A seeded simulation that starts trading at `startMs`; the same key replays the same trades. */
export function createLiveSim({ seedKey, basePrice, live, startMs }: { seedKey: string; basePrice: number; live: boolean; startMs: number }): LiveSim {
  const base = round1(basePrice);
  return { live, basePrice: base, price: base, anchor: base, nextAt: startMs, lastAt: startMs, burstUntil: 0, jumpTarget: null, rng: hashKey(seedKey) };
}

/**
 * Prints every trade due up to `untilMs`. All randomness is drawn per trade, so simulating in
 * steps gives the same trades as one call over the whole span (used to catch up after the tab
 * was in the background).
 */
export function simulateUntil(sim: LiveSim, untilMs: number): { sim: LiveSim; trades: LiveTrade[] } {
  const s = { ...sim };
  const trades: LiveTrade[] = [];
  const draw = () => {
    const [next, value] = nextRandom(s.rng);
    s.rng = next;
    return value;
  };
  const band = s.live ? MAX_DEVIATION.live : MAX_DEVIATION.preMatch;
  const lo = Math.max(1, s.basePrice - band);
  const hi = Math.min(99, s.basePrice + band);

  while (s.nextAt <= untilMs) {
    const t = s.nextAt;
    s.anchor += (s.basePrice - s.anchor) * (1 - Math.pow(0.5, (t - s.lastAt) / ANCHOR_HALF_LIFE_MS));
    const inBurst = t < s.burstUntil;
    const rate = (s.live ? LIVE_RATE : PRE_MATCH_RATE) * (inBurst ? BURST_FACTOR : 1);

    if (s.jumpTarget !== null) {
      // Walk most of the way to the jump's level over a few trades.
      const step = (s.jumpTarget - s.price) * (0.3 + draw() * 0.25);
      s.price = Math.abs(s.jumpTarget - s.price) < 0.15 ? s.jumpTarget : s.price + step;
      if (s.price === s.jumpTarget) s.jumpTarget = null;
    } else if (s.live && !inBurst && draw() < 1 / (JUMP_EVERY_SEC * rate)) {
      const size = 3 + draw() * 4;
      const up = s.price - s.basePrice > 4 ? false : s.price - s.basePrice < -4 ? true : draw() < 0.5;
      s.jumpTarget = round1(clamp(s.price + (up ? size : -size), lo, hi));
      s.anchor = clamp(s.basePrice + (s.jumpTarget - s.basePrice) * 0.7, lo, hi);
      s.burstUntil = t + BURST_MS;
    } else if (draw() >= 0.5) {
      // Half the prints trade at the last price; the rest move 0.1–0.3¢, leaning to the anchor.
      const ticks = 1 + Math.floor(draw() * 3);
      const pUp = 0.5 + clamp((s.anchor - s.price) * 0.08, -0.3, 0.3);
      s.price += (draw() < pUp ? 1 : -1) * ticks * 0.1;
    }

    s.price = round1(clamp(s.price, lo, hi));
    const size = Math.round((10 + draw() ** 2 * 1500) * (inBurst ? 2 : 1));
    trades.push({ t, price: s.price, size });

    s.lastAt = t;
    s.nextAt = t + Math.max(1, Math.round((-Math.log(1 - draw()) / rate) * 1000));
  }
  return { sim: s, trades };
}

/** Trades older than the longest window (120 × 1m) plus one bucket are no longer drawn. */
export function trimTrades(trades: LiveTrade[], nowMs: number): LiveTrade[] {
  const cutoff = nowMs - (CANDLE_WINDOW * CANDLE_INTERVAL_SECONDS["1m"] + 60) * 1000;
  const first = trades.findIndex((t) => t.t >= cutoff);
  return first <= 0 ? trades : trades.slice(first);
}

/**
 * `count` candles of `intervalSec` ending with the one that holds `endMs`. Each opens at the
 * previous close (the last trade before the window, else `fallbackPrice`), so intervals
 * without trades are flat with no volume.
 */
export function buildCandles(
  trades: readonly LiveTrade[],
  { intervalSec, endMs, count, fallbackPrice }: { intervalSec: number; endMs: number; count: number; fallbackPrice: number },
): Candle[] {
  const lastStart = Math.floor(endMs / 1000 / intervalSec) * intervalSec;
  const firstStart = lastStart - (count - 1) * intervalSec;
  let i = 0;
  let close = fallbackPrice;
  while (i < trades.length && trades[i].t < firstStart * 1000) close = trades[i++].price;

  const candles: Candle[] = [];
  for (let start = firstStart; start <= lastStart; start += intervalSec) {
    const end = (start + intervalSec) * 1000;
    const candle = { time: start, open: close, high: close, low: close, close, volume: 0 };
    while (i < trades.length && trades[i].t < end) {
      const { price, size } = trades[i++];
      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price;
      candle.volume += size;
    }
    close = candle.close;
    candles.push(candle);
  }
  return candles;
}
