"use client";

import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { useTradeContext } from "../components/TradeMockProvider";
import type { TradeActions, TradeState } from "../stores/tradeStore";

type Store = TradeState & TradeActions;

/** Reads page state; pass a selector to re-render only on what you use. */
export function useTrade<T>(selector: (state: Store) => T): T {
  const { store } = useTradeContext();
  return useStore(store, selector);
}

/** Like `useTrade`, for selectors that build a new object/array each time. */
export function useTradeShallow<T>(selector: (state: Store) => T): T {
  const { store } = useTradeContext();
  return useStore(store, useShallow(selector));
}

export const useTradeActions = () => useTradeContext().store.getState();
