"use client";

import { Gift, Lock, Pencil, Plus } from "lucide-react-sports";
import { outcomeTag, type EventShape, type YesNo } from "../../../domain";
import { cn } from "../../cn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/tooltip";

/**
 * The outcome pill: team alias with the YES / NO colour; 3+ outcome events add a YES / NO
 * suffix (reference PositionsTable.tsx:423-454).
 */
export function OutcomeTag({ outcome, label, eventShape }: { outcome: YesNo; label: string; eventShape?: EventShape }) {
  const tag = outcomeTag(label, eventShape);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider",
        outcome === "yes" ? "bg-win/15 text-win ring-1 ring-win/25" : "bg-loss/15 text-loss ring-1 ring-loss/25",
      )}
    >
      <span>{tag.text}</span>
      {tag.suffix && <span className="opacity-60">{outcome === "yes" ? "YES" : "NO"}</span>}
    </span>
  );
}

/** Purple AIRDROP pill; the literal purple matches the main OmenX site (reference AirdropBadge). */
export function AirdropBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-purple-300 ring-1 ring-purple-500/30">
      <Gift className="h-3 w-3" />
      Airdrop
    </span>
  );
}

/** TP / SL column: locked for vouchers, "+ TP/SL" when empty, the two values otherwise. */
export function TpSlCell({
  tp,
  sl,
  disabled,
  locked,
  onClick,
}: {
  tp: number | null;
  sl: number | null;
  disabled?: boolean;
  locked?: boolean;
  onClick: () => void;
}) {
  if (locked) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="inline-flex cursor-default items-center justify-center rounded-md border border-dashed border-border/60 bg-white/[0.02] px-2 py-1 text-muted-foreground/60"
              aria-label="TP/SL not available"
            >
              <Lock className="h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-center text-[11px] leading-snug">
            Voucher positions don&apos;t support TP/SL. Close manually within the hold window.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (tp === null && sl === null) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-dashed border-border bg-transparent px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground transition hover:border-foreground/40 hover:text-foreground",
          disabled && "opacity-50 hover:border-border hover:text-muted-foreground",
        )}
      >
        <Plus className="h-3 w-3" /> TP/SL
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group inline-flex items-center gap-2 rounded-md border border-border bg-white/[0.02] px-2 py-1 text-[10px] font-mono tabular-nums transition hover:bg-white/[0.05]",
        disabled && "opacity-60",
      )}
    >
      <div className="flex flex-col items-end leading-tight">
        <span className={cn(tp !== null ? "text-win" : "text-muted-foreground/50")}>TP {tp !== null ? `${tp}¢` : "—"}</span>
        <span className={cn(sl !== null ? "text-loss" : "text-muted-foreground/50")}>SL {sl !== null ? `${sl}¢` : "—"}</span>
      </div>
      <Pencil className="h-3 w-3 text-muted-foreground transition group-hover:text-foreground" />
    </button>
  );
}

/** Key / value line in the dialogs' summary boxes. */
export function Kv({ k, v, tone }: { k: string; v: string; tone?: "win" | "loss" }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("tabular-nums", tone === "win" ? "text-win" : tone === "loss" ? "text-loss" : "text-foreground")}>{v}</span>
    </div>
  );
}
