"use client";

import { useEffect, useRef } from "react";
import { cents, needsSideToggle, noCents, outcomeAlias, type SportsMarket, type YesNo } from "../../../domain";
import { cn } from "../../cn";

/**
 * "Pick market" chips plus, for 3+ outcomes, the YES/NO side (dev reference §5.7, reference
 * trade/TradeOutcomePicker.tsx). Controlled: the page owns the outcome and the side.
 */
export function TradeOutcomePicker({
  market,
  outcomeId,
  onOutcomeChange,
  side,
  onSideChange,
  className,
}: {
  market: SportsMarket;
  outcomeId?: string;
  onOutcomeChange: (outcomeId: string) => void;
  side: YesNo;
  onSideChange: (side: YesNo) => void;
  className?: string;
}) {
  const selected = market.outcomes.find((o) => o.id === outcomeId) ?? market.outcomes[0];
  const yesCents = cents(selected.price);
  // Up to three chips share the width; more scroll sideways behind a fade.
  const fitsWithoutScroll = market.outcomes.length <= 3;

  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current
      ?.querySelector<HTMLElement>(`[data-outcome-id="${selected.id}"]`)
      ?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [selected.id]);

  const chipClass = (active: boolean) =>
    active
      ? "bg-foreground/95 text-background ring-1 ring-foreground"
      : "bg-white/[0.04] text-foreground ring-1 ring-white/[0.06] hover:bg-white/[0.08]";

  return (
    <div className={cn("space-y-2", className)}>
      <div>
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Pick market</div>
        <div
          ref={scrollerRef}
          className={cn(
            "flex gap-2 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            fitsWithoutScroll ? "" : "[mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]",
          )}
        >
          {market.outcomes.map((o) => (
            <button
              key={o.id}
              data-outcome-id={o.id}
              type="button"
              onClick={() => onOutcomeChange(o.id)}
              className={cn(
                "flex shrink-0 snap-start items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left transition",
                fitsWithoutScroll ? "flex-1 basis-0" : "min-w-[112px]",
                chipClass(o.id === selected.id),
              )}
            >
              <span className="truncate font-mono text-[10px] uppercase tracking-widest">{outcomeAlias(o)}</span>
              <span className="font-display text-sm font-semibold tabular-nums">{cents(o.price)}¢</span>
            </button>
          ))}
        </div>
      </div>

      {needsSideToggle(market) && (
        <div>
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Pick side · {outcomeAlias(selected)}</div>
          <div className="grid grid-cols-2 gap-2">
            {(["yes", "no"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSideChange(s)}
                className={cn("flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left transition", chipClass(s === side))}
              >
                <span className="font-mono text-[10px] uppercase tracking-widest">{s === "yes" ? "Yes" : "No"}</span>
                <span className="font-display text-sm font-semibold tabular-nums">{s === "yes" ? yesCents : noCents(yesCents)}¢</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
