import type { TradeRow } from "../supabase-shape/rows";
import { createMockClient, type MockSupabaseClient } from "./client";
import { MockDatabase } from "./db";
import { accrueFundingFunction } from "./functions";
import { networkLatency, type Latency } from "./query";
import { processBinaryTrade } from "./rpc";
import { buildSeed, type SeedTables } from "./seed";
import { MarketSimulator, seededRandom, type Random } from "./simulators";

export { MOCK_USER_ID, buildSeed, type SeedTables } from "./seed";
export { noLatency, networkLatency, type Latency } from "./query";
export { seededRandom, type Random } from "./simulators";
export type { MockSupabaseClient } from "./client";
export type { MockChannel } from "./realtime";

export interface MockBackendOptions {
  seed?: SeedTables;
  latency?: Latency;
  random?: Random;
  priceIntervalMs?: number;
  /**
   * Fills a pending order on a non-binary market. Those fills are client-side
   * table writes in the reference, so the caller supplies them; binary orders
   * are filled by the mock `process_binary_trade`.
   */
  fillNonBinaryOrder?: (trade: TradeRow) => void;
}

export interface MockBackend {
  db: MockDatabase;
  client: MockSupabaseClient;
  simulator: MarketSimulator;
  start(): void;
  freeze(): void;
  reset(seed?: SeedTables): void;
}

/** Wires the in-memory database, the supabase-shaped client and the background jobs. */
export const createMockBackend = (options: MockBackendOptions = {}): MockBackend => {
  const db = new MockDatabase(options.seed ?? buildSeed());
  const client = createMockClient(db, options.latency ?? networkLatency);
  const simulator = new MarketSimulator(db, {
    random: options.random ?? seededRandom(20260924),
    priceIntervalMs: options.priceIntervalMs,
    onFundingTick: () => accrueFundingFunction(db),
    onLimitReached: (trade) => {
      try {
        const handled = processBinaryTrade(db, { p_mode: "fill", p_order_id: trade.id });
        if (!handled) options.fillNonBinaryOrder?.(trade);
      } catch (error) {
        // A fill the server refuses (e.g. the position changed) stays pending.
        console.warn(`[mock] limit order ${trade.id} not filled:`, error);
      }
    },
  });

  return {
    db,
    client,
    simulator,
    start: () => simulator.start(),
    freeze: () => simulator.freeze(),
    reset: (seed) => db.reset(seed ?? buildSeed()),
  };
};
