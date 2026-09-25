import { createStore, type StoreApi } from "zustand/vanilla";
import {
  applyPlacedOrder,
  buildSeed,
  cents,
  closePosition,
  deriveTicket,
  isBinaryMarket,
  livePositions,
  positionLeagueKey,
  positionsOnChart,
  type ChartPosition,
  type HistoryRow,
  type OrderRow,
  type PlacedOrder,
  type PositionLeagueKey,
  type PositionRow,
  type SportsMarket,
  type Ticket,
  type YesNo,
} from "../domain";

/** A toast the page shows after an action (texts as on the reference, event.$id.tsx:365-423). */
export interface Notice {
  tone: "success" | "info";
  message: string;
}

export interface EventPageState {
  market: SportsMarket;
  league: PositionLeagueKey;
  selectedIdx: number;
  /** Side for 3+ outcome markets; binary markets derive it from the selection. */
  multiSide: YesNo;
  positions: PositionRow[];
  orders: OrderRow[];
  history: HistoryRow[];
  /** Seconds since mount; drives the positions' mark jitter. */
  tick: number;
  /** Non-zero while the order form plays its pulse. */
  pulseKey: number;
}

export interface EventPageActions {
  selectOutcome(index: number): void;
  selectOutcomeById(outcomeId: string): void;
  setSide(side: YesNo): void;
  /** A row's Buy / YES / NO button: select it and pulse the form. */
  buyFromRow(index: number, side: YesNo): void;
  endPulse(): void;
  advanceTick(): void;
  placeOrder(order: PlacedOrder): void;
  closePosition(index: number): Notice | null;
  cancelOrder(index: number): Notice | null;
  updateTpsl(index: number, next: { tp: number | null; sl: number | null }): Notice;
  /** Navigating to another event with the page still mounted. */
  switchMarket(market: SportsMarket): void;
}

export type EventPageStore = StoreApi<EventPageState & EventPageActions>;

const selectedOutcome = (state: Pick<EventPageState, "market" | "selectedIdx">) =>
  state.market.outcomes[state.selectedIdx] ?? state.market.outcomes[0];

function seeded(market: SportsMarket) {
  const league = positionLeagueKey(market.league.short);
  return { market, league, ...buildSeed(market, league) };
}

/**
 * Page state for one event page (reference event.$id.tsx:275-552). The reference resets the
 * 3+ outcome side to YES whenever the selected outcome changes (an effect on the outcome id),
 * including right after a row's NO button selected a different outcome (dev reference BUG-10).
 */
export function createEventPageStore(market: SportsMarket): EventPageStore {
  return createStore<EventPageState & EventPageActions>()((set, get) => {
    // Applies a new selection with the reference's side reset.
    const select = (index: number, side?: YesNo) =>
      set((state) => {
        const nextId = (state.market.outcomes[index] ?? state.market.outcomes[0]).id;
        const changed = nextId !== selectedOutcome(state).id;
        const multiSide = !isBinaryMarket(state.market) && changed ? "yes" : (side ?? state.multiSide);
        return { selectedIdx: index, multiSide };
      });

    return {
      ...seeded(market),
      selectedIdx: 0,
      multiSide: "yes",
      tick: 0,
      pulseKey: 0,

      selectOutcome: (index) => select(index),
      selectOutcomeById: (outcomeId) => {
        const index = get().market.outcomes.findIndex((o) => o.id === outcomeId);
        if (index >= 0) select(index);
      },
      setSide: (side) => {
        const state = get();
        if (isBinaryMarket(state.market)) {
          const target = side === "yes" ? 0 : 1;
          if (target < state.market.outcomes.length) select(target);
        } else {
          set({ multiSide: side });
        }
      },
      buyFromRow: (index, side) => {
        if (isBinaryMarket(get().market)) select(index);
        else select(index, side);
        set((state) => ({ pulseKey: state.pulseKey + 1 }));
      },
      endPulse: () => set({ pulseKey: 0 }),
      advanceTick: () => set((state) => ({ tick: state.tick + 1 })),

      placeOrder: (order) => {
        const state = get();
        const placed = applyPlacedOrder({
          order,
          market: state.market,
          league: state.league,
          currentPx: cents(selectedOutcome(state).price),
        });
        if (placed.kind === "order") set({ orders: [placed.row, ...state.orders] });
        else set({ positions: [placed.row, ...state.positions] });
      },
      closePosition: (index) => {
        const state = get();
        const row = state.positions[index];
        if (!row) return null;
        const closed = closePosition(row, index, state.tick);
        set({ positions: state.positions.filter((_, i) => i !== index), history: [closed.history, ...state.history] });
        return {
          tone: "success",
          message: `Closed ${row.outcomeLabel} at ${closed.mark}¢ · ${closed.pnl >= 0 ? "+" : ""}${closed.pnl.toFixed(2)} USDC`,
        };
      },
      cancelOrder: (index) => {
        const state = get();
        const row = state.orders[index];
        if (!row) return null;
        set({ orders: state.orders.filter((_, i) => i !== index) });
        return { tone: "info", message: `Cancelled ${row.type} order on ${row.outcomeLabel} @ ${row.price}¢` };
      },
      updateTpsl: (index, next) => {
        set((state) => ({ positions: state.positions.map((p, i) => (i === index ? { ...p, tp: next.tp, sl: next.sl } : p)) }));
        if (next.tp === null && next.sl === null) return { tone: "info", message: "TP/SL removed" };
        const tp = next.tp != null ? `${next.tp}¢` : "—";
        const sl = next.sl != null ? `${next.sl}¢` : "—";
        return { tone: "success", message: `TP/SL updated · TP ${tp} / SL ${sl}` };
      },
      switchMarket: (nextMarket) =>
        set((state) => {
          // The selection index survives; the side resets if the selected outcome's id changes.
          const nextId = (nextMarket.outcomes[state.selectedIdx] ?? nextMarket.outcomes[0]).id;
          const resetSide = !isBinaryMarket(nextMarket) && nextId !== selectedOutcome(state).id;
          return { ...seeded(nextMarket), multiSide: resetSide ? "yes" : state.multiSide };
        }),
    };
  });
}

/** Binary: the selected outcome is the side; otherwise the side toggle. */
export const selectTradeSide = (state: EventPageState): YesNo =>
  isBinaryMarket(state.market) ? (state.selectedIdx === 0 ? "yes" : "no") : state.multiSide;

export const selectSelectedOutcome = selectedOutcome;

export const selectTicket = (state: EventPageState): Ticket =>
  deriveTicket({ market: state.market, outcomeId: selectedOutcome(state).id, side: selectTradeSide(state) });

export const selectLivePositions = (state: EventPageState): PositionRow[] => livePositions(state.positions, state.tick);

export const selectChartPositions = (rows: PositionRow[], market: SportsMarket): ChartPosition[] => positionsOnChart(rows, market);
