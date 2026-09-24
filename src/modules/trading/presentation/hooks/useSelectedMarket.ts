"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { findOption } from "../../domain";
import { resolveEvent, resolveOptionId } from "../selection";
import { loadLastEvent, loadLastOptions } from "../storage";
import { liveMarket } from "../stores/tradeStore";
import { useTrade, useTradeActions } from "./useTrade";

/**
 * The event and option on screen. Reads `?event=` (the page's only URL
 * parameter), falls back to the last viewed event, and keeps the URL in step
 * when the user switches events.
 */
export function useSelectedMarket() {
  const router = useRouter();
  const pathname = usePathname();
  const urlEventId = useSearchParams().get("event");
  const status = useTrade((state) => state.status);
  const listings = useTrade((state) => state.listings);
  const prices = useTrade((state) => state.prices);
  const selectedEventId = useTrade((state) => state.selectedEventId);
  const selectedOptionId = useTrade((state) => state.selectedOptionId);
  const actions = useTradeActions();

  const resolution = useMemo(
    () =>
      status === "ready"
        ? resolveEvent({ listings, urlEventId, lastEventId: selectedEventId ?? loadLastEvent() })
        : null,
    [status, listings, urlEventId, selectedEventId],
  );

  // Adopt the resolved event (and its remembered option) into page state.
  useEffect(() => {
    if (resolution?.kind !== "selected") return;
    const { listing } = resolution;
    if (listing.market.id === selectedEventId) return;
    actions.selectEvent(listing.market.id, resolveOptionId(listing, loadLastOptions()[listing.market.id]));
  }, [resolution, selectedEventId, actions]);

  const selectEvent = useCallback(
    (eventId: string) => {
      const listing = listings.find((row) => row.market.id === eventId);
      if (!listing) return;
      actions.selectEvent(eventId, resolveOptionId(listing, loadLastOptions()[eventId]));
      router.replace(`${pathname}?event=${encodeURIComponent(eventId)}`, { scroll: false });
    },
    [listings, actions, router, pathname],
  );

  const listing = resolution?.kind === "selected" ? resolution.listing : null;
  const market = listing ? liveMarket(listing, prices) : null;
  const option = market ? findOption(market, selectedOptionId) : undefined;

  return { status, resolution, listing, market, option, selectEvent, selectOption: actions.selectOption };
}
