"use client";

import { isBinaryMarket } from "../../domain";
import { useSelectedMarket } from "../hooks/useSelectedMarket";
import { OptionChips } from "./OptionChips";
import { TradeHeader } from "./header/TradeHeader";
import { TradeLayout } from "./TradeLayout";
import { EventEndedState, LoadingState, NoEventsState } from "./TradePageStates";

/** Chooses between the page states and the terminal. */
export function TradeScreen() {
  const { status, resolution, listing, market, option, selectEvent, selectOption } = useSelectedMarket();

  if (status === "loading" || !resolution) return <LoadingState />;
  if (resolution.kind === "expired") return <EventEndedState eventId={resolution.eventId} />;
  if (resolution.kind === "empty" || !market || !listing) return <NoEventsState />;

  const binary = isBinaryMarket(market.options);
  return (
    <TradeLayout
      eventId={market.id}
      header={<TradeHeader listing={listing} market={market} option={option} onSelectEvent={selectEvent} />}
      optionChips={
        binary ? undefined : <OptionChips options={market.options} selectedOptionId={option?.id} onSelect={selectOption} />
      }
      // Remaining sections are filled in by milestones M6–M9.
      chart={null}
      orderBook={null}
      bottomPanel={null}
      tradeForm={null}
    />
  );
}
