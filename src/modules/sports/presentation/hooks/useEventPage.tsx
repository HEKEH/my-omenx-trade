"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createEventPageStore, type EventPageActions, type EventPageState, type EventPageStore } from "../../application/event-page-store";
import type { SportsMarket } from "../../domain";

const EventPageContext = createContext<EventPageStore | null>(null);

/**
 * One page store per mounted event page. When the route's market changes while the page
 * stays mounted, the store re-seeds for the new market (reference event.$id.tsx:339-344).
 */
export function EventPageProvider({ market, children }: { market: SportsMarket; children: ReactNode }) {
  const [store] = useState(() => createEventPageStore(market));

  useEffect(() => {
    if (store.getState().market.id !== market.id) store.getState().switchMarket(market);
  }, [store, market]);

  useTicker(store);
  useOutcomeDeepLink(store, market);

  return <EventPageContext.Provider value={store}>{children}</EventPageContext.Provider>;
}

export function useEventPage<T>(selector: (state: EventPageState & EventPageActions) => T): T {
  const store = useContext(EventPageContext);
  if (!store) throw new Error("useEventPage must be used inside EventPageProvider");
  return useStore(store, selector);
}

/** One tick per second after mount (the positions' mark jitter; frozen by the visual scripts, R-3). */
function useTicker(store: EventPageStore) {
  useEffect(() => {
    const id = setInterval(() => store.getState().advanceTick(), 1000);
    return () => clearInterval(id);
  }, [store]);
}

/** `?outcome=<id>` pre-selects that outcome on mount and after switching events (dev reference §8). */
function useOutcomeDeepLink(store: EventPageStore, market: SportsMarket) {
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("outcome");
    if (wanted) store.getState().selectOutcomeById(wanted);
  }, [store, market]);
}
