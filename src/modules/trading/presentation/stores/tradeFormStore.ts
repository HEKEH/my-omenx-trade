import { createStore } from "zustand/vanilla";
import type { OrderType } from "../../domain";

export interface TradeFormState {
  orderType: OrderType;
  /** Raw text of the limit price input. */
  limitPrice: string;
}

export interface TradeFormActions {
  setOrderType(orderType: OrderType): void;
  setLimitPrice(price: string): void;
  /** A click on an order book level: switch to a limit order at that price. */
  applyBookPrice(price: string): void;
}

export type TradeFormStore = ReturnType<typeof createTradeFormStore>;

/** Order form state; completed in M7. */
export const createTradeFormStore = () =>
  createStore<TradeFormState & TradeFormActions>()((set) => ({
    orderType: "Market",
    limitPrice: "",
    setOrderType: (orderType) => set({ orderType }),
    setLimitPrice: (limitPrice) => set({ limitPrice }),
    applyBookPrice: (price) => set({ orderType: "Limit", limitPrice: price }),
  }));
