"use client";

import { useEffect, useMemo, useState } from "react";
import { ageTape, formatAgo, injectFill, nextFill, seededRandom, seedTape, TAPE_INJECT_MS, TAPE_ROWS, type SportsMarket } from "../../../domain";
import { cn } from "../../cn";

/**
 * Recent public fills (dev reference §5.6, reference event/LiveTape.tsx): seeded from the
 * market id, ages ticking every second and a new fill every 4.2s (none while the clock seed is
 * negative, BUG-11).
 */
export function LiveTape({ market, className, rows = TAPE_ROWS }: { market: SportsMarket; className?: string; rows?: number }) {
  const initial = useMemo(() => seedTape(market, rows), [market, rows]);
  const [fills, setFills] = useState(initial);
  const [seededFor, setSeededFor] = useState(initial);
  if (seededFor !== initial) {
    setSeededFor(initial);
    setFills(initial);
  }

  useEffect(() => {
    const r = seededRandom(Date.now());
    const age = setInterval(() => setFills((prev) => ageTape(prev)), 1000);
    const inject = setInterval(() => {
      setFills((prev) => {
        const fill = nextFill(r, market, `live-${Date.now()}`);
        return fill ? injectFill(prev, fill, rows) : prev;
      });
    }, TAPE_INJECT_MS);
    return () => {
      clearInterval(age);
      clearInterval(inject);
    };
  }, [market, rows]);

  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-4 shadow-card", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Live tape · recent fills</div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_8px_var(--accent)]" />
          Live
        </div>
      </div>
      <div className="space-y-0.5 font-mono text-[11px] tabular-nums">
        {fills.map((f, i) => (
          <div
            key={f.id}
            className={cn(
              "grid grid-cols-[1fr_56px_96px_64px_32px] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors",
              i === 0 && "bg-white/[0.04]",
            )}
          >
            <span className="truncate text-muted-foreground">{f.user}</span>
            <span className={cn("w-full rounded-sm py-0.5 text-center text-[10px] uppercase", f.side === "buy" ? "bg-win/15 text-win" : "bg-loss/15 text-loss")}>
              {f.side}
            </span>
            <span className={cn("truncate text-right", f.outcomeIdx === 0 ? "text-primary" : "text-neon")}>{f.outcomeLabel}</span>
            <span className="text-right text-foreground">{f.price}¢</span>
            <span className="text-right text-muted-foreground">{formatAgo(f.agoSec)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
