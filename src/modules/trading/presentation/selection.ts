import type { MarketListing } from "../application";

export type EventResolution =
  | { kind: "selected"; listing: MarketListing }
  /** `?event=` names an event that is not open (resolved or unknown). */
  | { kind: "expired"; eventId: string }
  | { kind: "empty" };

/**
 * Which event the page shows: the URL's `?event=` first, then the last event
 * the user viewed, then the first open event. An unknown `?event=` shows the
 * "event has ended" fallback instead of silently picking another event.
 */
export const resolveEvent = ({
  listings,
  urlEventId,
  lastEventId,
}: {
  listings: readonly MarketListing[];
  urlEventId: string | null;
  lastEventId: string | null;
}): EventResolution => {
  const byId = (id: string | null) => (id ? listings.find((listing) => listing.market.id === id) : undefined);
  if (urlEventId) {
    const listing = byId(urlEventId);
    return listing ? { kind: "selected", listing } : { kind: "expired", eventId: urlEventId };
  }
  const listing = byId(lastEventId) ?? listings[0];
  return listing ? { kind: "selected", listing } : { kind: "empty" };
};

/**
 * Events shown in the header dropdown: favourites first if asked, then a
 * case-insensitive name match.
 */
export const filterEvents = (
  listings: readonly MarketListing[],
  { query, favoritesOnly, favorites }: { query: string; favoritesOnly: boolean; favorites: readonly string[] },
) => {
  const needle = query.trim().toLowerCase();
  return listings.filter(
    (listing) =>
      (!favoritesOnly || favorites.includes(listing.market.id)) &&
      (!needle || listing.market.name.toLowerCase().includes(needle)),
  );
};

/** The remembered option for this event if it still exists, otherwise its first option. */
export const resolveOptionId = (listing: MarketListing, remembered: string | undefined) => {
  const { options } = listing.market;
  return options.some((option) => option.id === remembered) ? remembered! : (options[0]?.id ?? null);
};
