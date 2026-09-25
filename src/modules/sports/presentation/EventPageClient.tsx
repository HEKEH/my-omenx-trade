"use client";

import type { EventPageData } from "../application/use-cases";
import { EventHeader } from "./components/header/EventHeader";
import { SportsShell } from "./components/shell/SportsShell";
import { SportsTopBar } from "./components/shell/SportsTopBar";
import { LiveStagePlaceholder } from "./components/stage/LiveStagePlaceholder";
import { PreMatchStrip } from "./components/stage/PreMatchStrip";
import { StageTabs, type StageTab } from "./components/stage/StageTabs";
import { EventPageProvider, useEventPage } from "./hooks/useEventPage";

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
  const isLive = Boolean(market.isLiveStream && market.fixture && market.liveScore);
  const isPreMatch = !isLive && Boolean(market.fixture);

  return (
    <SportsShell>
      <SportsTopBar userName={data.user.name} userAvatar={data.user.avatar} equity={data.account.available} />

      <div className="grid gap-5 px-6 pb-10 pt-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <EventHeader market={market} outcomeId={selectedId} />
          {isPreMatch && <PreMatchStrip market={market} />}
          {isLive && (
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
                  { id: "markets", label: "Markets", content: null },
                ] satisfies StageTab[]
              }
            />
          )}
        </div>

        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1 lg:[scrollbar-gutter:stable]" />
      </div>

      <div className="space-y-5 px-6 pb-28 md:px-8 lg:pb-12" />
    </SportsShell>
  );
}
