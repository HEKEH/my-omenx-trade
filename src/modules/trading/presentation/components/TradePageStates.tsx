"use client";

import Link from "next/link";
import { ArrowLeft, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_COPY } from "../copy";

export function LoadingState() {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">{PAGE_COPY.loading}</p>
      </div>
    </div>
  );
}

export function NoEventsState() {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <p className="text-lg font-medium text-foreground">{PAGE_COPY.noEvents}</p>
        <p className="text-sm text-muted-foreground">{PAGE_COPY.noEventsHint}</p>
        <Link href="/" className="text-primary hover:underline">
          {PAGE_COPY.returnHome}
        </Link>
      </div>
    </div>
  );
}

/**
 * Shown for an unknown or resolved `?event=`. The settled/active event pages
 * are out of scope, so both actions lead back to the trade page (R-3).
 */
export function EventEndedState({ eventId }: { eventId: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Clock className="w-10 h-10 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">{PAGE_COPY.eventEnded}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{PAGE_COPY.eventEndedHint}</p>
        </div>

        <div className="w-full bg-muted/50 rounded-lg px-4 py-3 border border-border/50">
          <p className="text-xs text-muted-foreground">{PAGE_COPY.eventId}</p>
          <p className="text-sm font-mono text-foreground mt-0.5 truncate">{eventId}</p>
        </div>

        <div className="w-full space-y-3">
          <Button asChild variant="outline" className="w-full gap-2">
            <Link href="/trade">
              <Search className="w-4 h-4" />
              {PAGE_COPY.viewSettled}
            </Link>
          </Button>
          <Button asChild className="w-full gap-2">
            <Link href="/trade">
              <ArrowLeft className="w-4 h-4" />
              {PAGE_COPY.browseActive}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
