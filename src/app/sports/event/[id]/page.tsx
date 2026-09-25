import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadEventPage } from "@/modules/sports/application/use-cases";
import { eventPageSources } from "@/modules/sports/infrastructure/repositories";
import { SPORTS_OG_IMAGE } from "@/modules/sports/presentation/seo";

// The page itself is rendered by the event layout (EventHost); this segment owns the
// per-event metadata and the not-found state (reference event.$id.tsx:35-62).
export async function generateMetadata({ params }: PageProps<"/sports/event/[id]">): Promise<Metadata> {
  const { id } = await params;
  const market = loadEventPage(id, eventPageSources)?.market;
  const title = market ? `${market.title} — OmenX Sports` : "Event — OmenX Sports";
  const description = market
    ? `Trade ${market.title}. ${market.league.name} · Volume ${market.volume} · Ends ${market.endsLabel}.`
    : "Trade sports prediction markets on OmenX.";
  // Next replaces the layout's openGraph object as a whole, so the shared fields are repeated.
  return { title, description, openGraph: { title, description, type: "website", images: SPORTS_OG_IMAGE } };
}

export default async function SportsEventPage({ params }: PageProps<"/sports/event/[id]">) {
  const { id } = await params;
  if (!loadEventPage(id, eventPageSources)) notFound();
  return null;
}
