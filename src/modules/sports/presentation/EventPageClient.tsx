"use client";

import { useEffect, useMemo } from "react";
import { selectTicket, selectTradeSide } from "../application/event-page-store";
import type { EventPageData } from "../application/use-cases";
import { isLiveMarket, livePositions, positionsOnChart } from "../domain";
import { OutcomesPanel } from "./components/outcomes/OutcomesPanel";
import { PositionsTable } from "./components/positions/PositionsTable";
import { RelatedMarketsBar } from "./components/related/RelatedMarketsBar";
import { LiveTape } from "./components/tape/LiveTape";
import { TradeForm } from "./components/trade/TradeForm";
import { TradeOutcomePicker } from "./components/trade/TradeOutcomePicker";
import { cn } from "./cn";
import { EventHeader } from "./components/header/EventHeader";
import { SportsShell } from "./components/shell/SportsShell";
import { SportsTopBar } from "./components/shell/SportsTopBar";
import { LiveStagePlaceholder } from "./components/stage/LiveStagePlaceholder";
import { PreMatchStrip } from "./components/stage/PreMatchStrip";
import { StageTabs, type StageTab } from "./components/stage/StageTabs";
import { EventPageProvider, useEventPage } from "./hooks/useEventPage";
import { showNotice } from "./notify";

/** The event page (dev reference §2, reference event.$id.tsx:554-660). */
export function EventPageClient({ data }: { data: EventPageData }) {
  return (
    <EventPageProvider market={data.market}>
      <EventPageLayout data={data} />
    </EventPageProvider>
  );
}

function EventPageLayout({ data }: { data: EventPageData }) {
  const market = useEventPage((s) => s.market);
  const selectedId = useEventPage((s) => (s.market.outcomes[s.selectedIdx] ?? s.market.outcomes[0]).id);
  const selectedIdx = useEventPage((s) => s.selectedIdx);
  const tradeSide = useEventPage(selectTradeSide);
  const positions = useEventPage((s) => s.positions);
  const tick = useEventPage((s) => s.tick);
  const selectOutcome = useEventPage((s) => s.selectOutcome);
  const buyFromRow = useEventPage((s) => s.buyFromRow);
  const closePosition = useEventPage((s) => s.closePosition);
  const orders = useEventPage((s) => s.orders);
  const history = useEventPage((s) => s.history);
  const cancelOrder = useEventPage((s) => s.cancelOrder);
  const updateTpsl = useEventPage((s) => s.updateTpsl);
  const selectOutcomeById = useEventPage((s) => s.selectOutcomeById);
  const setSide = useEventPage((s) => s.setSide);
  const placeOrder = useEventPage((s) => s.placeOrder);
  const pulseKey = useEventPage((s) => s.pulseKey);
  const endPulse = useEventPage((s) => s.endPulse);
  const formOutcome = useEventPage((s) => selectTicket(s).formOutcome);
  const formLabel = useEventPage((s) => selectTicket(s).formLabel);
  const formPrice = useEventPage((s) => selectTicket(s).formPrice);

  // The pulse plays once per row buy (reference event.$id.tsx:481-485).
  useEffect(() => {
    if (pulseKey === 0) return;
    const t = setTimeout(endPulse, 700);
    return () => clearTimeout(t);
  }, [pulseKey, endPulse]);

  const live = useMemo(() => livePositions(positions, tick), [positions, tick]);
  const chartPositions = useMemo(() => positionsOnChart(live, market), [live, market]);
  const isLive = isLiveMarket(market);
  const isPreMatch = !isLive && Boolean(market.fixture);

  const outcomes = (
    <OutcomesPanel
      market={market}
      selectedIdx={selectedIdx}
      tradeSide={tradeSide}
      onSelect={selectOutcome}
      onSideSelect={buyFromRow}
      chartPositions={chartPositions}
      onClosePosition={(index) => showNotice(closePosition(index))}
    />
  );

  return (
    <SportsShell>
      <SportsTopBar userName={data.user.name} userAvatar={data.user.avatar} equity={data.account.available} />

      <div className="grid gap-5 px-6 pb-10 pt-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <EventHeader market={market} outcomeId={selectedId} />
          {isPreMatch && <PreMatchStrip market={market} />}
          {isLive ? (
            <StageTabs
              defaultTabId="stream"
              tabs={
                [
                  {
                    id: "stream",
                    label: "Stream",
                    badge: <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_8px_var(--accent)]" />,
                    content: <LiveStagePlaceholder market={market} />,
                  },
                  { id: "markets", label: "Markets", content: outcomes },
                ] satisfies StageTab[]
              }
            />
          ) : (
            outcomes
          )}
          <LiveTape market={market} />
        </div>

        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1 lg:[scrollbar-gutter:stable]">
          <div className="rounded-2xl border border-border bg-surface p-3 shadow-card lg:sticky lg:top-0 lg:z-10">
            <TradeOutcomePicker market={market} outcomeId={selectedId} onOutcomeChange={selectOutcomeById} side={tradeSide} onSideChange={setSide} />
          </div>
          {/* Remounted per outcome and side, so the inputs start over (reference event.$id.tsx:634). */}
          <TradeForm
            key={`${market.id}-${selectedId}-${tradeSide}`}
            className={cn(pulseKey > 0 && "animate-trade-pulse")}
            outcome={formOutcome}
            outcomeLabel={formLabel}
            price={formPrice}
            onPlaceOrder={placeOrder}
          />
        </div>
      </div>

      <div className="space-y-5 px-6 pb-28 md:px-8 lg:pb-12">
        <RelatedMarketsBar markets={data.related} />
        <PositionsTable
          positions={live}
          orders={orders}
          history={history}
          onClosePosition={(index) => showNotice(closePosition(index))}
          onCancelOrder={(index) => showNotice(cancelOrder(index))}
          onUpdateTpsl={(index, next) => showNotice(updateTpsl(index, next))}
        />
      </div>
    </SportsShell>
  );
}
