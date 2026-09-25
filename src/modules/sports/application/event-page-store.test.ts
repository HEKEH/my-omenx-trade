import { describe, expect, it } from "vitest";
import type { PlacedOrder } from "../domain";
import { marketRepository } from "../infrastructure/repositories";
import { createEventPageStore, selectTicket, selectTradeSide } from "./event-page-store";

const market = (id: string) => marketRepository.getById(id)!;

const order = (over: Partial<PlacedOrder> = {}): PlacedOrder => ({
  side: "buy",
  type: "market",
  outcome: "yes",
  outcomeLabel: "USA YES",
  price: 48,
  margin: 100,
  leverage: 1,
  notional: 100,
  shares: 208.33,
  fee: 0.2,
  liq: 0,
  tp: null,
  sl: null,
  label: "Buy USA YES @ 48¢",
  ...over,
});

describe("selection and side (dev reference §8)", () => {
  it("starts on the first outcome, YES", () => {
    const store = createEventPageStore(market("wc26-usa-par"));
    expect(store.getState().selectedIdx).toBe(0);
    expect(selectTradeSide(store.getState())).toBe("yes");
    expect(selectTicket(store.getState()).formLabel).toBe("USA YES");
  });

  it("3-way: the side toggle changes the side only", () => {
    const store = createEventPageStore(market("wc26-usa-par"));
    store.getState().setSide("no");
    expect(selectTicket(store.getState())).toMatchObject({ formLabel: "USA NO", formPrice: 52 });
  });

  it("3-way: picking another outcome resets the side to YES", () => {
    const store = createEventPageStore(market("wc26-usa-par"));
    store.getState().setSide("no");
    store.getState().selectOutcome(2);
    expect(selectTicket(store.getState()).formLabel).toBe("PAR YES");
  });

  it("row NO on another outcome ends on YES; on the same outcome it sticks (BUG-10)", () => {
    const store = createEventPageStore(market("wc26-usa-par"));
    store.getState().buyFromRow(1, "no");
    expect(selectTicket(store.getState()).formLabel).toBe("Draw YES");
    store.getState().buyFromRow(1, "no");
    expect(selectTicket(store.getState()).formLabel).toBe("Draw NO");
  });

  it("row buys pulse the form; the pulse can be cleared", () => {
    const store = createEventPageStore(market("wc26-usa-par"));
    store.getState().buyFromRow(0, "yes");
    store.getState().buyFromRow(0, "yes");
    expect(store.getState().pulseKey).toBe(2);
    store.getState().endPulse();
    expect(store.getState().pulseKey).toBe(0);
  });

  it("binary: flipping the side selects the other outcome", () => {
    const store = createEventPageStore(market("liv-new"));
    store.getState().setSide("no");
    expect(store.getState().selectedIdx).toBe(1);
    expect(selectTradeSide(store.getState())).toBe("no");
    expect(selectTicket(store.getState()).formLabel).toBe("Newcastle");
    store.getState().setSide("yes");
    expect(store.getState().selectedIdx).toBe(0);
  });

  it("selects by outcome id and ignores unknown ids", () => {
    const store = createEventPageStore(market("wc26-usa-par"));
    store.getState().selectOutcomeById("a");
    expect(store.getState().selectedIdx).toBe(2);
    store.getState().selectOutcomeById("nope");
    expect(store.getState().selectedIdx).toBe(2);
  });
});

describe("portfolio actions (dev reference §5.9)", () => {
  it("seeds three positions, two orders and three history rows", () => {
    const state = createEventPageStore(market("wc26-usa-par")).getState();
    expect([state.positions.length, state.orders.length, state.history.length]).toEqual([3, 2, 3]);
  });

  it("a resting limit buy goes to the orders; a market order to the positions", () => {
    const store = createEventPageStore(market("wc26-usa-par"));
    store.getState().placeOrder(order({ type: "limit", price: 40 }));
    expect(store.getState().orders[0]).toMatchObject({ price: 40, size: 208, filled: 0 });
    store.getState().placeOrder(order());
    expect(store.getState().positions[0]).toMatchObject({ entry: 48, size: 208, mode: "cross" });
    expect(store.getState().positions).toHaveLength(4);
  });

  it("closing at the current tick moves the row to history and returns the toast", () => {
    const store = createEventPageStore(market("wc26-usa-par"));
    for (let i = 0; i < 5; i++) store.getState().advanceTick();
    const notice = store.getState().closePosition(1);
    expect(notice).toEqual({ tone: "success", message: "Closed Draw at 31¢ · +0.27 USDC" });
    expect(store.getState().positions).toHaveLength(2);
    expect(store.getState().history[0]).toMatchObject({ action: "close", price: 31, pnl: 0.27, when: "Just now" });
    expect(store.getState().closePosition(9)).toBeNull();
  });

  it("negative PnL toasts without a plus sign", () => {
    const store = createEventPageStore(market("wc26-usa-par"));
    // Tick 14: jitter −1.4 → mark 42.6 → rounded 43 → (43 − 44)/100 × 180.
    for (let i = 0; i < 14; i++) store.getState().advanceTick();
    expect(store.getState().closePosition(0)).toEqual({ tone: "success", message: "Closed USA at 43¢ · -1.80 USDC" });
  });

  it("cancelling removes the order", () => {
    const store = createEventPageStore(market("wc26-usa-par"));
    expect(store.getState().cancelOrder(0)).toEqual({ tone: "info", message: "Cancelled limit order on USA @ 42¢" });
    expect(store.getState().orders).toHaveLength(1);
    expect(store.getState().cancelOrder(5)).toBeNull();
  });

  it("TP/SL updates the row; clearing both says removed", () => {
    const store = createEventPageStore(market("wc26-usa-par"));
    expect(store.getState().updateTpsl(1, { tp: 20, sl: null })).toEqual({ tone: "success", message: "TP/SL updated · TP 20¢ / SL —" });
    expect(store.getState().positions[1]).toMatchObject({ tp: 20, sl: null });
    expect(store.getState().updateTpsl(0, { tp: null, sl: null })).toEqual({ tone: "info", message: "TP/SL removed" });
    expect(store.getState().positions[0]).toMatchObject({ tp: null, sl: null });
  });

  // The reference keeps the route component mounted across events (R-12, verified in M8).
  it("switching market re-seeds the rows and keeps the selection index", () => {
    const store = createEventPageStore(market("wc26-usa-par"));
    store.getState().selectOutcome(2);
    store.getState().cancelOrder(0);
    store.getState().switchMarket(market("che-psg-2025-ucl"));
    const state = store.getState();
    expect(state.market.id).toBe("che-psg-2025-ucl");
    expect(state.orders).toHaveLength(2);
    expect(state.selectedIdx).toBe(2);
  });
});
