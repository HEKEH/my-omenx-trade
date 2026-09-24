"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { isBinaryMarket } from "../../domain";
import { useSelectedMarket } from "../hooks/useSelectedMarket";
import { useTrade } from "../hooks/useTrade";
import { OptionChips } from "./OptionChips";
import { ChartCard } from "./chart/ChartCard";
import { TradeHeader } from "./header/TradeHeader";
import { OrderBookCard } from "./orderbook/OrderBookCard";
import { TradeLayout } from "./TradeLayout";
import { EventEndedState, LoadingState, NoEventsState } from "./TradePageStates";

/** Chooses between the page states and the terminal. */
export function TradeScreen() {
  const { status, resolution, listing, market, option, selectEvent, selectOption } = useSelectedMarket();
  const side = useTrade((state) => state.side);

  if (status === "loading" || !resolution) return <LoadingState />;
  if (resolution.kind === "expired") return <EventEndedState eventId={resolution.eventId} />;
  if (resolution.kind === "empty" || !market || !listing) return <NoEventsState />;

  const binary = isBinaryMarket(market.options);
  return (
    <TooltipProvider>
      <TradeLayout
        eventId={market.id}
        header={<TradeHeader listing={listing} market={market} option={option} onSelectEvent={selectEvent} />}
        optionChips={
          binary ? undefined : <OptionChips options={market.options} selectedOptionId={option?.id} onSelect={selectOption} />
        }
        chart={<ChartCard market={market} option={option} side={side} />}
        orderBook={<OrderBookCard optionId={option?.id} side={side} />}
        // Remaining sections are filled in by milestones M7–M9.
        bottomPanel={null}
        tradeForm={null}
      />
    </TooltipProvider>
  );
}
