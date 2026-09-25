"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createEventPageStore, type EventPageActions, type EventPageState, type EventPageStore } from "../../application/event-page-store";
import type { SportsMarket } from "../../domain";

const EventPageContext = createContext<EventPageStore | null>(null);

/**
 * The reference keeps its route component mounted when you follow a link to another event, so
 * the selection, side and clock carry over while the rows re-seed (dev reference R-12). Next
 * remounts the page instead, so the browser keeps the page store here between client-side
 * navigations; a full load starts fresh, and the server always builds a new one.
 */
let browserStore: EventPageStore | null = null;

function storeFor(market: SportsMarket): EventPageStore {
  if (typeof window === "undefined") return createEventPageStore(market);
  if (!browserStore) browserStore = createEventPageStore(market);
  else if (browserStore.getState().market.id !== market.id) browserStore.getState().switchMarket(market);
  return browserStore;
}

/** Provides the page store for one event page. */
export function EventPageProvider({ market, children }: { market: SportsMarket; children: ReactNode }) {
  const [store] = useState(() => storeFor(market));

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

/** One tick per second while the page is shown (the positions' mark jitter; frozen by the visual scripts, R-3). */
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
