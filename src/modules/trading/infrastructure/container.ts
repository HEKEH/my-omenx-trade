import type { TradingRuntime } from "../application";
import { MockMarketDataFeed } from "./marketdata/feed";
import {
  MOCK_USER_ID,
  createMockBackend,
  networkLatency,
  seededRandom,
  type Latency,
  type MockBackend,
  type SeedTables,
} from "./mock-server";
import { installDevtools, startsFrozen } from "./mock-server/devtools";
import { SupabaseRealtimeFeed } from "./repositories/realtimeFeed";
import {
  SupabaseAccountRepository,
  SupabaseMarketRepository,
  SupabaseOrderRepository,
  SupabasePositionRepository,
} from "./repositories/supabaseRepositories";
import { SupabaseTradingGateway } from "./repositories/tradingGateway";

/** The runtime plus the mock backend (for tests and dev controls). `start` honours the frozen start and installs the dev controls. */
export interface TradingContainer extends TradingRuntime {
  backend: MockBackend;
}

export interface ContainerOptions {
  seed?: SeedTables;
  latency?: Latency;
  randomSeed?: number;
  /** Start the simulator immediately; defaults to `!NEXT_PUBLIC_TRADE_MOCK_FREEZE`. */
  autoStart?: boolean;
}

/**
 * Wires the application ports to the mock backend. Swapping in a real
 * backend means replacing this function; nothing above it changes.
 */
export const createTradingContainer = (options: ContainerOptions = {}): TradingContainer => {
  const backend = createMockBackend({
    seed: options.seed,
    latency: options.latency ?? networkLatency,
    random: seededRandom(options.randomSeed ?? 20260924),
    // Only invoked by the running simulator, after `gateway` below exists.
    fillNonBinaryOrder: (trade) => {
      gateway.fillNonBinaryOrder(trade).catch((error) => {
        console.warn(`[mock] limit order ${trade.id} not filled:`, error);
      });
    },
  });
  const { client } = backend;
  const account = new SupabaseAccountRepository(client, MOCK_USER_ID);
  const gateway = new SupabaseTradingGateway(client, MOCK_USER_ID, account);

  const marketData = new MockMarketDataFeed({
    random: seededRandom((options.randomSeed ?? 20260924) + 1),
    priceOf: (optionId) => backend.db.find("event_options", (row) => row.id === optionId)?.price,
    frozen: () => !backend.simulator.running,
  });

  let uninstall = () => {};
  return {
    deps: {
      account,
      positions: new SupabasePositionRepository(client, MOCK_USER_ID),
      orders: new SupabaseOrderRepository(client, MOCK_USER_ID),
      gateway,
    },
    markets: new SupabaseMarketRepository(client),
    realtime: new SupabaseRealtimeFeed(client, MOCK_USER_ID),
    marketData,
    backend,
    start: () => {
      if (options.autoStart ?? !startsFrozen()) backend.start();
      uninstall = installDevtools(backend);
    },
    stop: () => {
      backend.freeze();
      uninstall();
    },
  };
};
