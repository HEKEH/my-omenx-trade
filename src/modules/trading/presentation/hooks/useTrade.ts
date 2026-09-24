"use client";

import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { useTradeContext } from "../components/TradeMockProvider";
import type { TradeFormActions, TradeFormState } from "../stores/tradeFormStore";
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

type Form = TradeFormState & TradeFormActions;

/** Reads order form state. */
export function useTradeForm<T>(selector: (state: Form) => T): T {
  const { form } = useTradeContext();
  return useStore(form, selector);
}

export const useTradeFormActions = () => useTradeContext().form.getState();
