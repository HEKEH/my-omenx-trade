"use client";

import { useMemo } from "react";
import { useTradeContext } from "../components/TradeMockProvider";

/** Header stats and the tracked reference quantity for an event. */
export function useMarketStats(eventId: string) {
  const { container } = useTradeContext();
  return useMemo(() => container.marketData.stats(eventId), [container, eventId]);
}
