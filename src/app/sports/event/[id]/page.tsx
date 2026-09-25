import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadEventPage } from "@/modules/sports/application/use-cases";
import { eventPageSources } from "@/modules/sports/infrastructure/repositories";
import { EventPageClient } from "@/modules/sports/presentation/EventPageClient";

// Composition root: the page reads the mock repositories and hands plain data to the client.
export async function generateMetadata({ params }: PageProps<"/sports/event/[id]">): Promise<Metadata> {
  const { id } = await params;
  const market = loadEventPage(id, eventPageSources)?.market;
  const title = market ? `${market.title} — OmenX Sports` : "Event — OmenX Sports";
  const description = market
    ? `Trade ${market.title}. ${market.league.name} · Volume ${market.volume} · Ends ${market.endsLabel}.`
    : "Trade sports prediction markets on OmenX.";
  return { title, description, openGraph: { title, description } };
}

export default async function SportsEventPage({ params }: PageProps<"/sports/event/[id]">) {
  const { id } = await params;
  const data = loadEventPage(id, eventPageSources);
  if (!data) notFound();
  return <EventPageClient data={data} />;
}
