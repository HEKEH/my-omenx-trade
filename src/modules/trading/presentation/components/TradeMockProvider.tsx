"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { TradingRuntime } from "../../application";
// Composition root: the only presentation file that knows which backend runs.
import { createTradingContainer } from "../../infrastructure/container";
import { createTradeFormStore, type TradeFormStore } from "../stores/tradeFormStore";
import { createTradeStore, type TradeStore } from "../stores/tradeStore";

interface TradeContextValue {
  container: TradingRuntime;
  store: TradeStore;
  form: TradeFormStore;
}

const TradeContext = createContext<TradeContextValue | null>(null);

/** Coalesces bursts of realtime row changes into one refresh. */
const debounce = (fn: () => void, ms: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
};

/**
 * Creates the mock backend and page state in the browser only. The server
 * render and the first client render both show `fallback`, so random mock
 * data and timers never cause a hydration mismatch.
 */
export function TradeMockProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [value, setValue] = useState<TradeContextValue | null>(null);

  useEffect(() => {
    const container = createTradingContainer();
    const store = createTradeStore(container);
    const { realtime } = container;
    const refresh = debounce(() => void store.getState().refreshPortfolio(), 50);
    const unsubscribe = [
      realtime.onPrice((update) => store.getState().applyPrice(update)),
      realtime.onPositionsChanged(refresh),
      realtime.onOrdersChanged(refresh),
    ];
    container.start();
    void store.getState().load();
    // After a devtools reset the page reloads its data, so states like "no events" can be reproduced.
    const controls = typeof window === "undefined" ? undefined : window.__tradeMock;
    if (controls) {
      const reset = controls.reset;
      controls.reset = (overrides) => {
        reset(overrides);
        void store.getState().load();
      };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the container must be created on the client only
    setValue({ container, store, form: createTradeFormStore() });
    return () => {
      unsubscribe.forEach((off) => off());
      container.stop();
    };
  }, []);

  if (!value) return fallback;
  return <TradeContext.Provider value={value}>{children}</TradeContext.Provider>;
}

export const useTradeContext = () => {
  const value = useContext(TradeContext);
  if (!value) throw new Error("useTradeContext must be used inside <TradeMockProvider>");
  return value;
};
