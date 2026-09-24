import { createStore } from "zustand/vanilla";
import {
  loadPortfolio,
  type AccountView,
  type MarketListing,
  type OrderView,
  type PositionView,
  type PriceUpdate,
  type TradingRuntime,
} from "../../application";
import type { Market, OrderSide } from "../../domain";
import { loadFavorites, saveFavorites, saveLastEvent, saveLastOption } from "../storage";

export interface TradeState {
  status: "loading" | "ready" | "error";
  error: string | null;
  listings: MarketListing[];
  /** Live Yes price per option id. */
  prices: Record<string, number>;
  previousPrices: Record<string, number>;
  /** First price seen this session, the base for the change figure until candles exist. */
  openPrices: Record<string, number>;
  lastPriceAt: string | null;
  /** Live funding per option id. */
  funding: MarketListing["funding"];
  account: AccountView | null;
  positions: PositionView[];
  orders: OrderView[];
  selectedEventId: string | null;
  selectedOptionId: string | null;
  side: OrderSide;
  favorites: string[];
}

export interface TradeActions {
  load(): Promise<void>;
  applyPrice(update: PriceUpdate): void;
  refreshPortfolio(): Promise<void>;
  selectEvent(eventId: string, optionId: string | null): void;
  selectOption(optionId: string): void;
  setSide(side: OrderSide): void;
  toggleFavorite(eventId: string): boolean;
}

export type TradeStore = ReturnType<typeof createTradeStore>;

const pricesOf = (listings: readonly MarketListing[]) =>
  Object.fromEntries(listings.flatMap((listing) => listing.market.options.map((option) => [option.id, option.price])));

export const createTradeStore = (runtime: TradingRuntime) =>
  createStore<TradeState & TradeActions>()((set, get) => ({
    status: "loading",
    error: null,
    listings: [],
    prices: {},
    previousPrices: {},
    openPrices: {},
    lastPriceAt: null,
    funding: {},
    account: null,
    positions: [],
    orders: [],
    selectedEventId: null,
    selectedOptionId: null,
    side: "buy",
    favorites: [],

    async load() {
      try {
        const [listings, { account, positions, orders }] = await Promise.all([
          runtime.markets.listActiveMarkets(),
          loadPortfolio(runtime.deps),
        ]);
        const prices = pricesOf(listings);
        set({
          status: "ready",
          listings,
          prices,
          openPrices: prices,
          funding: Object.assign({}, ...listings.map((listing) => listing.funding)),
          account,
          positions,
          orders,
          favorites: loadFavorites(),
        });
      } catch (error) {
        set({ status: "error", error: error instanceof Error ? error.message : String(error) });
      }
    },

    applyPrice(update) {
      const { prices, previousPrices, openPrices, funding } = get();
      set({
        funding: { ...funding, [update.optionId]: update.funding },
        prices: { ...prices, [update.optionId]: update.price },
        previousPrices: { ...previousPrices, [update.optionId]: update.previousPrice ?? prices[update.optionId] },
        openPrices: update.optionId in openPrices ? openPrices : { ...openPrices, [update.optionId]: update.price },
        lastPriceAt: update.at,
      });
    },

    async refreshPortfolio() {
      set(await loadPortfolio(runtime.deps));
    },

    selectEvent(eventId, optionId) {
      set({ selectedEventId: eventId, selectedOptionId: optionId, side: "buy" });
      saveLastEvent(eventId);
      if (optionId) saveLastOption(eventId, optionId);
    },

    selectOption(optionId) {
      const { selectedEventId } = get();
      set({ selectedOptionId: optionId });
      if (selectedEventId) saveLastOption(selectedEventId, optionId);
    },

    setSide(side) {
      set({ side });
    },

    toggleFavorite(eventId) {
      const { favorites } = get();
      const added = !favorites.includes(eventId);
      const next = added ? [...favorites, eventId] : favorites.filter((id) => id !== eventId);
      set({ favorites: next });
      saveFavorites(next);
      return added;
    },
  }));

/** The market with live option prices applied. */
export const liveMarket = (listing: MarketListing, prices: Record<string, number>): Market => ({
  ...listing.market,
  options: listing.market.options.map((option) => ({ ...option, price: prices[option.id] ?? option.price })),
});
