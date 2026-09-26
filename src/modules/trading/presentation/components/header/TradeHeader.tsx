"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Star } from "lucide-react";
import { toast } from "sonner";
import type { MarketListing } from "../../../application";
import type { Market, OutcomeOption } from "../../../domain";
import { useCountdown } from "../../hooks/useCountdown";
import { useDismiss } from "../../hooks/useDismiss";
import { useMarketStats } from "../../hooks/useMarketStats";
import { useTrade, useTradeActions } from "../../hooks/useTrade";
import { EventSelector } from "./EventSelector";
import { MarketStatsStrip } from "./MarketStatsStrip";
import { RealtimeIndicator } from "./RealtimeIndicator";

interface TradeHeaderProps {
  listing: MarketListing;
  market: Market;
  option: OutcomeOption | undefined;
  onSelectEvent: (eventId: string) => void;
  /** The reference shows a back button only when navigated here; /trade has no in-app entry. */
  showBack?: boolean;
  onBack?: () => void;
}

export function TradeHeader({ listing, market, option, onSelectEvent, showBack = false, onBack }: TradeHeaderProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDismiss([triggerRef, panelRef], open, () => setOpen(false));
  const countdown = useCountdown(market.endTime);
  const stats = useMarketStats(market.id);
  const listings = useTrade((state) => state.listings);
  const favorites = useTrade((state) => state.favorites);
  const funding = useTrade((state) => (option ? state.funding[option.id] : undefined));
  const actions = useTradeActions();
  const isFavorite = favorites.includes(market.id);

  const toggleFavorite = (eventId: string) => {
    const added = actions.toggleFavorite(eventId);
    toast.success(added ? "Added to favorites" : "Removed from favorites");
  };

  return (
    <header className="flex items-center gap-4 px-4 py-2 bg-background border-b border-border/30">
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center transition-all duration-200 hover:bg-muted flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      )}

      <div className="flex items-center gap-3 flex-1 min-w-0 relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-2 min-w-0 hover:bg-muted/30 rounded-lg p-1 transition-colors"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate">{market.name}</span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <span className="w-1.5 h-1.5 bg-trading-red rounded-full animate-pulse" />
              <span>Ends in</span>
              <span className="text-trading-red font-mono font-medium">{countdown}</span>
            </div>
          </div>
        </button>

        <RealtimeIndicator listing={listing} indicator={stats.indicator} />

        {open && (
          <EventSelector
            ref={panelRef}
            listings={listings}
            selectedEventId={market.id}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onSelect={(eventId) => {
              onSelectEvent(eventId);
              setOpen(false);
            }}
          />
        )}
      </div>

      <MarketStatsStrip stats={stats} funding={funding} />

      <button
        type="button"
        onClick={() => toggleFavorite(market.id)}
        className="p-2 rounded-md hover:bg-muted/50 transition-colors flex-shrink-0"
      >
        <Star
          className={`w-5 h-5 transition-colors cursor-pointer ${
            isFavorite ? "text-trading-yellow fill-trading-yellow" : "text-muted-foreground hover:text-trading-yellow"
          }`}
        />
      </button>
    </header>
  );
}
