"use client";

import { ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { MarketListing, ReferenceIndicator } from "../../../application";
import { formatDate } from "../../format";

/**
 * The tracked quantity of an event (tweet count or asset price) with a
 * details popover. Events without one show nothing, as in the reference.
 */
export function RealtimeIndicator({ listing, indicator }: { listing: MarketListing; indicator: ReferenceIndicator | null }) {
  if (!indicator) return null;
  const isPrice = indicator.kind === "price";
  const { market, startDate } = listing;
  const end = market.endTime ?? new Date();
  const period = startDate ? `${formatDate(startDate)} - ${formatDate(end)}` : formatDate(end);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 bg-indicator/10 border border-indicator/30 rounded-lg hover:bg-indicator/20 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-indicator rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">{isPrice ? "Current Price" : "Current Tweets"}</span>
          </div>
          <span className="text-sm text-indicator font-mono font-bold">{indicator.value}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{isPrice ? (listing.priceLabel ?? "Current Price") : "Tweet Count"}</span>
            <div className="text-right">
              <div className="text-lg font-bold text-indicator">{indicator.value}</div>
              {indicator.change24h && (
                <div
                  className={`text-xs font-mono ${indicator.change24h.startsWith("+") ? "text-trading-green" : "text-trading-red"}`}
                >
                  {indicator.change24h} (24h)
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 border-t border-border/30 pt-2">
            <div className="flex justify-between">
              <span>Period</span>
              <span>{period}</span>
            </div>
            <div className="flex justify-between">
              <span>Last updated</span>
              <span>Just now</span>
            </div>
          </div>

          {listing.sourceUrl && (
            <a
              href={listing.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {listing.sourceName ?? "View Source"}
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
