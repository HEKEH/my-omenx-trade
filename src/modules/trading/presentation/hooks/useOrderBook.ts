"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarketDataSnapshot, RecentTrade } from "../../application";
import {
  aggregateOrderBook,
  depthPercent,
  mirrorOrderBook,
  mirrorPrice,
  type AggregatedLevel,
  type OrderSide,
} from "../../domain";
import { useTradeContext } from "../components/TradeMockProvider";

export interface BookRow extends AggregatedLevel {
  /** Depth bar width in percent of the deepest level on this side. */
  depth: number;
  /** Amount changed since the previous tick (drives the flash). */
  updated: boolean;
}

export interface TradeRow extends RecentTrade {
  isNew: boolean;
}

export interface OrderBookView {
  asks: BookRow[];
  bids: BookRow[];
  midPrice: number;
  rising: boolean;
  buyRatio: number;
  trades: TradeRow[];
}

interface Pushed {
  current: MarketDataSnapshot;
  previous: MarketDataSnapshot | null;
  /** Direction of the last mid-price move (unchanged ticks keep it). */
  rising: boolean;
}

const aggregate = (snapshot: MarketDataSnapshot, side: OrderSide, step: number) => {
  const book = side === "sell" ? mirrorOrderBook(snapshot.book) : snapshot.book;
  return { asks: aggregateOrderBook(book.asks, step, "ask"), bids: aggregateOrderBook(book.bids, step, "bid") };
};

const rows = (levels: AggregatedLevel[], previous: AggregatedLevel[] | undefined): BookRow[] => {
  const before = new Map(previous?.map((level) => [level.price, level.amount]));
  const max = Math.max(0, ...levels.map((level) => level.total));
  return levels.map((level) => ({
    ...level,
    depth: depthPercent(level.total, max),
    updated: before.has(level.price) && before.get(level.price) !== level.amount,
  }));
};

/**
 * Live order book and trades for an option, seen from the order side: the No
 * side mirrors prices to `1 − p` and swaps asks and bids. Levels are grouped
 * into `step`-wide buckets.
 */
export function useOrderBook(optionId: string | undefined, side: OrderSide, step: number): OrderBookView | null {
  const { container } = useTradeContext();
  const [pushed, setPushed] = useState<Pushed | null>(null);

  useEffect(() => {
    if (!optionId) return;
    return container.marketData.subscribe(optionId, (next) =>
      setPushed((last) => {
        const lastMid = last?.current.midPrice;
        const rising = lastMid === undefined || next.midPrice === lastMid ? (last?.rising ?? true) : next.midPrice > lastMid;
        return { current: next, previous: last?.current ?? null, rising };
      }),
    );
  }, [container, optionId]);

  return useMemo(() => {
    if (!pushed) return null;
    const { current, previous } = pushed;
    const now = aggregate(current, side, step);
    const before = previous ? aggregate(previous, side, step) : undefined;
    const price = (value: number) => (side === "sell" ? mirrorPrice(value) : value);
    return {
      asks: rows(now.asks, before?.asks),
      bids: rows(now.bids, before?.bids),
      midPrice: price(current.midPrice),
      // On the No side a rising Yes price is a falling No price.
      rising: side === "sell" ? !pushed.rising : pushed.rising,
      buyRatio: current.buyRatio,
      trades: current.trades.map((trade, index) => ({
        ...trade,
        price: price(trade.price),
        isNew: index === 0 && current.newTrade !== null,
      })),
    };
  }, [pushed, side, step]);
}
