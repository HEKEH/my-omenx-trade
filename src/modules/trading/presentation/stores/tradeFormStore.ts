import { createStore } from "zustand/vanilla";
import type { OrderType, TpSlMode } from "../../domain";

export type InputMode = "amount" | "qty";

export interface TradeFormState {
  marginMode: "Cross";
  leverage: number;
  orderType: OrderType;
  /** Raw text of the limit price input; empty means "use the current price". */
  limitPrice: string;
  /** Raw text of the size input: USDC in amount mode, contracts in qty mode. */
  size: string;
  inputMode: InputMode;
  /** Position of the percent-of-balance slider (0–100). */
  percent: number;
  tpSlEnabled: boolean;
  tpMode: TpSlMode;
  slMode: TpSlMode;
  tpValue: string;
  slValue: string;
}

export interface TradeFormActions {
  setLeverage(leverage: number): void;
  setOrderType(orderType: OrderType): void;
  setLimitPrice(price: string): void;
  setSize(size: string): void;
  toggleInputMode(): void;
  /** Slider: size becomes that share of the available balance. */
  setPercent(percent: number, available: number): void;
  toggleTpSl(): void;
  setTpMode(mode: TpSlMode): void;
  setSlMode(mode: TpSlMode): void;
  setTpValue(value: string): void;
  setSlValue(value: string): void;
  /** A click on an order book level: switch to a limit order at that price. */
  applyBookPrice(price: string): void;
  /** Clears the size and TP/SL after an order is submitted. */
  resetAfterSubmit(): void;
}

export type TradeFormStore = ReturnType<typeof createTradeFormStore>;

const INITIAL: TradeFormState = {
  marginMode: "Cross",
  leverage: 10,
  orderType: "Market",
  limitPrice: "",
  size: "0.00",
  inputMode: "amount",
  percent: 0,
  tpSlEnabled: false,
  tpMode: "pct",
  slMode: "pct",
  tpValue: "",
  slValue: "",
};

export const createTradeFormStore = () =>
  createStore<TradeFormState & TradeFormActions>()((set) => ({
    ...INITIAL,
    setLeverage: (leverage) => set({ leverage }),
    setOrderType: (orderType) => set({ orderType }),
    setLimitPrice: (limitPrice) => set({ limitPrice }),
    setSize: (size) => set({ size }),
    toggleInputMode: () => set((state) => ({ inputMode: state.inputMode === "amount" ? "qty" : "amount" })),
    setPercent: (percent, available) => set({ percent, inputMode: "amount", size: ((available * percent) / 100).toFixed(2) }),
    toggleTpSl: () => set((state) => ({ tpSlEnabled: !state.tpSlEnabled })),
    setTpMode: (tpMode) => set({ tpMode }),
    setSlMode: (slMode) => set({ slMode }),
    setTpValue: (tpValue) => set({ tpValue }),
    setSlValue: (slValue) => set({ slValue }),
    applyBookPrice: (price) => set({ orderType: "Limit", limitPrice: price }),
    resetAfterSubmit: () => set({ size: "0.00", percent: 0, tpValue: "", slValue: "" }),
  }));
