"use client";

import { Info } from "lucide-react-sports";
import { cn } from "../../cn";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";

/**
 * The "ⓘ" next to live scores: a popover explaining that live data lags the venue
 * (reference live/LiveDelayInfo.tsx). Only the score variant is used on this page.
 */
export function LiveDelayInfo({ tone = "muted", className }: { tone?: "muted" | "onMedia"; className?: string }) {
  const triggerCls = tone === "onMedia" ? "text-white/60 hover:text-white" : "text-muted-foreground hover:text-foreground";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="About live data delay"
          onClick={(e) => e.stopPropagation()}
          className={cn("inline-flex shrink-0 items-center justify-center rounded-full transition", triggerCls, className)}
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={6}
        className="z-[80] w-72 border-border bg-background/95 p-4 text-xs leading-relaxed text-muted-foreground shadow-2xl backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground">About live data</div>
        <p>
          Live scores and match time shown here may lag the venue by <span className="text-foreground">30–60 seconds</span>. They are
          indicative — settlement always uses the official result.
        </p>
      </PopoverContent>
    </Popover>
  );
}
