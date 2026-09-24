import type { MockBackend } from "./index";
import { buildSeed, type SeedTables } from "./seed";

/** Controls for the mock backend, exposed to browser devtools in development. */
export interface TradeMockControls {
  /** Stops the price walk, funding and limit fills. */
  freeze(): void;
  resume(): void;
  /** Restores the seed; any table in `overrides` replaces the seeded one, e.g. `{ events: [] }`. */
  reset(overrides?: Partial<SeedTables>): void;
  /** Sets an option's price and pushes the realtime update. */
  setPrice(optionId: string, price: number): void;
}

declare global {
  interface Window {
    __tradeMock?: TradeMockControls;
  }
}

/** Whether the page should start with the simulator frozen (`NEXT_PUBLIC_TRADE_MOCK_FREEZE=1`). */
export const startsFrozen = () => process.env.NEXT_PUBLIC_TRADE_MOCK_FREEZE === "1";

export const createControls = (backend: MockBackend): TradeMockControls => ({
  freeze: () => backend.freeze(),
  resume: () => backend.start(),
  reset: (overrides = {}) => backend.reset({ ...buildSeed(), ...overrides }),
  setPrice: (optionId, price) => {
    backend.db.update("event_options", (row) => row.id === optionId, {
      price,
      updated_at: new Date().toISOString(),
    });
    backend.simulator.checkLimitOrders();
  },
});

/** Installs `window.__tradeMock` outside production; returns an uninstaller. */
export const installDevtools = (backend: MockBackend) => {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") return () => {};
  window.__tradeMock = createControls(backend);
  return () => {
    delete window.__tradeMock;
  };
};
