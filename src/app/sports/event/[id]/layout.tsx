import type { Metadata } from "next";
import { loadEventPage } from "@/modules/sports/application/use-cases";
import { eventPageSources } from "@/modules/sports/infrastructure/repositories";
import { SPORTS_OG_IMAGE } from "@/modules/sports/presentation/seo";

// Per-event metadata (reference event.$id.tsx:35-62). It lives on this layout rather than the
// page: when the page calls notFound(), Next drops the page's metadata but keeps the layouts',
// so an unknown id still gets "Event — OmenX Sports" in the server HTML like the reference.
export async function generateMetadata({ params }: LayoutProps<"/sports/event/[id]">): Promise<Metadata> {
  const { id } = await params;
  const market = loadEventPage(id, eventPageSources)?.market;
  const title = market ? `${market.title} — OmenX Sports` : "Event — OmenX Sports";
  const description = market
    ? `Trade ${market.title}. ${market.league.name} · Volume ${market.volume} · Ends ${market.endsLabel}.`
    : "Trade sports prediction markets on OmenX.";
  // Next replaces the root layout's openGraph object as a whole, so the shared fields are repeated.
  return { title, description, openGraph: { title, description, type: "website", images: SPORTS_OG_IMAGE } };
}

export default function EventIdLayout({ children }: LayoutProps<"/sports/event/[id]">) {
  return children;
}
