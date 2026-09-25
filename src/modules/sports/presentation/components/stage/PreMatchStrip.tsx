"use client";

import { useEffect, useMemo, useState } from "react";
import { Cloud, Timer, Users2 } from "lucide-react-sports";
import { formatCountdown, preMatchInfo, type SportsMarket } from "../../../domain";
import { cn } from "../../cn";

/**
 * Kickoff countdown, projected formations and venue weather for fixtures that are not live
 * (dev reference §5.3). Kickoff is `offsetMs` after the page loads. The first render shows the
 * full offset without reading the clock, so server and client agree (R-4); the clock starts
 * after mount.
 */
export function PreMatchStrip({ market, className }: { market: SportsMarket; className?: string }) {
  const info = useMemo(() => preMatchInfo(market), [market]);
  const [remainingMs, setRemainingMs] = useState(info.offsetMs);

  useEffect(() => {
    const target = Date.now() + info.offsetMs;
    const tick = () => setRemainingMs(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [info.offsetMs]);

  const fixture = market.fixture;
  if (!fixture) return null;
  const remaining = formatCountdown(remainingMs);

  return (
    <div className={cn("grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card md:grid-cols-3", className)}>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/30">
          <Timer className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Kickoff · {fixture.whenLabel} {fixture.kickoff}
          </div>
          <div className="mt-0.5 flex items-baseline gap-1 font-mono text-base tabular-nums text-foreground">
            <span>{remaining.h}</span>
            <span className="text-muted-foreground">h</span>
            <span>{remaining.m}</span>
            <span className="text-muted-foreground">m</span>
            <span className="text-primary">{remaining.s}</span>
            <span className="text-muted-foreground">s</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05] ring-1 ring-white/10">
          <Users2 className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Projected lineups</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-foreground">
            <span className="truncate">{fixture.home.short ?? fixture.home.name}</span>
            <span className="font-mono text-primary">{info.homeFormation}</span>
            <span className="text-muted-foreground">·</span>
            <span className="truncate">{fixture.away.short ?? fixture.away.name}</span>
            <span className="font-mono text-neon">{info.awayFormation}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05] ring-1 ring-white/10">
          <Cloud className="h-4 w-4 text-foreground" />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Venue weather</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground">
            <span aria-hidden>{info.weather.icon}</span>
            <span>{info.weather.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
