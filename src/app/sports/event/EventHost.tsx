"use client";

import { useMemo, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { loadEventPage } from "@/modules/sports/application/use-cases";
import { eventPageSources } from "@/modules/sports/infrastructure/repositories";
import { EventPageClient } from "@/modules/sports/presentation/EventPageClient";

/**
 * Composition root of the event page, rendered from the /sports/event layout. The layout is not
 * keyed by [id], so following a link to another event keeps this tree mounted, as the
 * reference's route component stays mounted: the selection, the positions tab, the chart
 * range and the stage tab carry over while the rows re-seed (dev reference R-12).
 * Unknown ids render nothing here; the page segment shows not-found.
 */
export function EventHost({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const data = useMemo(() => loadEventPage(id, eventPageSources), [id]);
  return (
    <>
      {data && <EventPageClient data={data} />}
      {children}
    </>
  );
}
