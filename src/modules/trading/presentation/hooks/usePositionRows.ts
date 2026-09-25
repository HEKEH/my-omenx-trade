"use client";

import { useMemo } from "react";
import { markPriceOf, type MarketListing, type OrderView, type PositionView } from "../../application";
import {
  binaryOutcome,
  computeAccountRisk,
  displayOptionLabel,
  liquidationPrice,
  returnOnMargin,
  unrealizedPnl,
  type BinaryOutcome,
  type SideLabels,
} from "../../domain";
import { useTrade } from "./useTrade";

export interface PositionRowView {
  position: PositionView;
  /** Option label with binary aliases applied. */
  displayOption: string;
  outcome: BinaryOutcome | null;
  sideLabels: SideLabels | undefined;
  markPrice: number;
  pnl: number;
  roe: number;
  liqPrice: number | null;
  listing: MarketListing | undefined;
}

export interface OrderRowView {
  order: OrderView;
  displayOption: string;
  outcome: BinaryOutcome | null;
  sideLabels: SideLabels | undefined;
  listing: MarketListing | undefined;
}

const listingFor = (listings: readonly MarketListing[], eventName: string) =>
  listings.find((listing) => listing.market.name === eventName);

/** Open positions with live mark, P&L and liquidation estimates (all from the domain). */
export function usePositionRows(): PositionRowView[] {
  const positions = useTrade((state) => state.positions);
  const prices = useTrade((state) => state.prices);
  const listings = useTrade((state) => state.listings);
  return useMemo(
    () =>
      positions.map((position) => {
        const listing = listingFor(listings, position.eventName);
        const markPrice = markPriceOf(position, prices);
        const pnl = unrealizedPnl({ entryPrice: position.entryPrice, markPrice, size: position.size });
        return {
          position,
          displayOption: listing ? displayOptionLabel(position.optionLabel, listing.market) : position.optionLabel,
          outcome: binaryOutcome(position.optionLabel),
          sideLabels: listing?.market.sideLabels,
          markPrice,
          pnl,
          roe: returnOnMargin(pnl, position.margin),
          liqPrice: liquidationPrice(position.entryPrice, position.leverage),
          listing,
        };
      }),
    [positions, prices, listings],
  );
}

export function useOrderRows(): OrderRowView[] {
  const orders = useTrade((state) => state.orders);
  const listings = useTrade((state) => state.listings);
  return useMemo(
    () =>
      orders.map((order) => {
        const listing = listingFor(listings, order.eventName);
        return {
          order,
          // The reference's orders table reads rows without display aliases, so a binary
          // order shows its raw label ("No", not the team name) there and in its dialogs (E-37).
          displayOption: order.optionLabel,
          outcome: binaryOutcome(order.optionLabel),
          sideLabels: listing?.market.sideLabels,
          listing,
        };
      }),
    [orders, listings],
  );
}

/** Unified account risk from the real balance and live position P&L. */
export function useAccountRisk() {
  const balance = useTrade((state) => state.account?.balance ?? 0);
  const rows = usePositionRows();
  return useMemo(
    () => ({
      ...computeAccountRisk({
        balance,
        positions: rows.map((row) => ({ margin: row.position.margin, unrealizedPnl: row.pnl })),
      }),
      hasPositions: rows.length > 0,
    }),
    [balance, rows],
  );
}
