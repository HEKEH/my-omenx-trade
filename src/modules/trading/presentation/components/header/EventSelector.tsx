"use client";

import { useState, type KeyboardEvent } from "react";
import { Search, Star } from "lucide-react";
import type { MarketListing } from "../../../application";
import { formatDate } from "../../format";
import { filterEvents } from "../../selection";

interface EventSelectorProps {
  listings: readonly MarketListing[];
  selectedEventId: string;
  favorites: readonly string[];
  onSelect: (eventId: string) => void;
  onToggleFavorite: (eventId: string) => void;
}

const starClass = (active: boolean) =>
  `w-4 h-4 transition-colors ${active ? "text-trading-yellow fill-trading-yellow" : "text-muted-foreground hover:text-trading-yellow"}`;

/** The header's event dropdown: search, favourites filter and the event list. */
export function EventSelector({ listings, selectedEventId, favorites, onSelect, onToggleFavorite }: EventSelectorProps) {
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const events = filterEvents(listings, { query, favoritesOnly, favorites });

  const choose = (eventId: string) => {
    onSelect(eventId);
    setQuery("");
  };
  // Rows hold a nested favourite button, so the row itself is not a <button>.
  const onRowKey = (event: KeyboardEvent, eventId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(eventId);
    }
  };

  return (
    <div className="absolute left-0 top-full mt-2 z-50 bg-background border border-border rounded-lg shadow-xl w-[500px]">
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={favoritesOnly ? "Search favorites..." : "Search events..."}
            className="flex-1 bg-transparent outline-hidden text-sm"
          />
          <button
            type="button"
            onClick={() => setFavoritesOnly((value) => !value)}
            className="p-1 rounded hover:bg-muted/50 transition-colors"
            title={favoritesOnly ? "Show all events" : "Show favorites only"}
          >
            <Star className={starClass(favoritesOnly)} />
          </button>
        </div>
        {favoritesOnly && (
          <div className="mt-2 text-xs text-trading-yellow flex items-center gap-1">
            <Star className="w-3 h-3 fill-trading-yellow" />
            Showing favorites only ({events.length})
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 text-xs text-muted-foreground px-4 py-2 border-b border-border/30">
        <span>Event</span>
        <span className="text-right">End Date</span>
        <span className="text-right">Volume</span>
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            {favoritesOnly ? (
              <>
                <Star className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-1">No favorites yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Click the star icon next to events to add them to your favorites
                </p>
                <button
                  type="button"
                  onClick={() => setFavoritesOnly(false)}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  View all events
                </button>
              </>
            ) : (
              <>
                <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No events found</p>
                <p className="text-xs text-muted-foreground/70">Try a different search term</p>
              </>
            )}
          </div>
        ) : (
          events.map(({ market, volume }) => (
            <div
              key={market.id}
              role="button"
              tabIndex={0}
              onClick={() => choose(market.id)}
              onKeyDown={(event) => onRowKey(event, market.id)}
              className={`w-full grid grid-cols-3 items-center px-4 py-3 text-left hover:bg-muted/50 transition-colors cursor-pointer ${
                selectedEventId === market.id ? "bg-muted/30" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFavorite(market.id);
                  }}
                  className="p-1.5 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Star className={starClass(favorites.includes(market.id))} />
                </button>
                <span className="text-sm font-medium truncate">{market.name}</span>
              </div>
              <span className="text-xs text-muted-foreground text-right">
                {market.endTime ? formatDate(market.endTime) : ""}
              </span>
              <span className="text-xs font-mono text-right">{volume ?? "$0"}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
