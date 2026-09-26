import { notFound } from "next/navigation";
import { loadEventPage } from "@/modules/sports/application/use-cases";
import { eventPageSources } from "@/modules/sports/infrastructure/repositories";

// The page itself is rendered by the event layout (EventHost) and the metadata by this
// segment's layout; the page owns the not-found state (reference event.$id.tsx:64-81).
export default async function SportsEventPage({ params }: PageProps<"/sports/event/[id]">) {
  const { id } = await params;
  if (!loadEventPage(id, eventPageSources)) notFound();
  return null;
}
