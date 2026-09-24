"use client";

import { isBinaryMarket } from "../../domain";
import { useSelectedMarket } from "../hooks/useSelectedMarket";
import { TradeLayout } from "./TradeLayout";
import { EventEndedState, LoadingState, NoEventsState } from "./TradePageStates";

/** Chooses between the page states and the terminal. */
export function TradeScreen() {
  const { status, resolution, market } = useSelectedMarket();

  if (status === "loading" || !resolution) return <LoadingState />;
  if (resolution.kind === "expired") return <EventEndedState eventId={resolution.eventId} />;
  if (resolution.kind === "empty" || !market) return <NoEventsState />;

  const binary = isBinaryMarket(market.options);
  return (
    <TradeLayout
      eventId={market.id}
      // Sections are filled in by milestones M5–M9; placeholders keep the layout measurable.
      header={<header className="flex items-center gap-4 px-4 py-2 bg-background border-b border-border/30" />}
      optionChips={binary ? undefined : <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30" />}
      chart={null}
      orderBook={null}
      bottomPanel={null}
      tradeForm={null}
    />
  );
}
