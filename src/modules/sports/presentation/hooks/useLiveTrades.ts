"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  CANDLE_INTERVAL_SECONDS,
  CANDLE_WINDOW,
  createLiveSim,
  LIVE_SIM_STEP_MS,
  simulateUntil,
  trimTrades,
  type LiveSim,
  type LiveTrade,
} from "../../domain";

export interface LiveTradesSnapshot {
  trades: LiveTrade[];
  /** Time of the last step, epoch ms (0 before the feed starts). */
  now: number;
}

const EMPTY: LiveTradesSnapshot = { trades: [], now: 0 };

/**
 * One outcome's simulated trade feed. It starts with the longest window already traded
 * (120 × 1m), then steps every LIVE_SIM_STEP_MS. A step after the tab was in the background
 * prints every trade it missed, so the chart has no hole.
 */
function createLiveFeed(seedKey: string, basePrice: number, live: boolean) {
  let snapshot = EMPTY;
  let sim: LiveSim | null = null;
  const listeners = new Set<() => void>();

  const step = () => {
    const now = Date.now();
    sim ??= createLiveSim({ seedKey, basePrice, live, startMs: now - CANDLE_WINDOW * CANDLE_INTERVAL_SECONDS["1m"] * 1000 });
    const next = simulateUntil(sim, now);
    sim = next.sim;
    snapshot = { trades: trimTrades([...snapshot.trades, ...next.trades], now), now };
    listeners.forEach((listener) => listener());
  };

  return {
    start() {
      step();
      const id = setInterval(step, LIVE_SIM_STEP_MS);
      return () => clearInterval(id);
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
  };
}

const noopSubscribe = () => () => {};
const getEmpty = () => EMPTY;

/** Trades for `seedKey` while `enabled`; a new key (another event or outcome) starts over. */
export function useLiveTrades({ seedKey, basePrice, live, enabled }: { seedKey: string; basePrice: number; live: boolean; enabled: boolean }) {
  const feed = useMemo(() => (enabled ? createLiveFeed(seedKey, basePrice, live) : null), [enabled, seedKey, basePrice, live]);
  useEffect(() => feed?.start(), [feed]);
  return useSyncExternalStore(feed?.subscribe ?? noopSubscribe, feed?.getSnapshot ?? getEmpty, getEmpty);
}
