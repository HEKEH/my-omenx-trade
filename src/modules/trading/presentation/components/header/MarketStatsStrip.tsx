"use client";

import type { MarketStats } from "../../../application";
import { useNow } from "../../hooks/useCountdown";

interface MarketStatsStripProps {
  stats: MarketStats;
  /** Selected option's hourly funding; the reference hard-coded these two figures (FIX-6). */
  funding: { ratePerHour: number; nextFundingAt: string | null } | undefined;
}

const formatRate = (ratePerHour: number) => `${ratePerHour >= 0 ? "+" : ""}${(ratePerHour * 100).toFixed(4)}%`;

const minutesUntil = (iso: string | null, now: number) =>
  iso ? `${Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 60_000))}min` : "--";

export function MarketStatsStrip({ stats, funding }: MarketStatsStripProps) {
  const now = useNow(1000);
  const rate = funding?.ratePerHour ?? 0;
  return (
    <div className="flex items-center gap-6 text-xs">
      <div>
        <div className="text-muted-foreground">24h Volume</div>
        <div className="font-mono font-medium">{stats.volume24h}</div>
      </div>
      <div>
        <div className="text-muted-foreground">OI</div>
        <div className="font-mono font-medium">{stats.openInterest}</div>
      </div>
      <div>
        <div className="text-muted-foreground">Funding Rate</div>
        <div className={`font-mono font-medium ${rate >= 0 ? "text-trading-green" : "text-trading-red"}`}>
          {formatRate(rate)}
        </div>
      </div>
      <div>
        <div className="text-muted-foreground">Next Funding</div>
        <div className="font-mono font-medium">{minutesUntil(funding?.nextFundingAt ?? null, now)}</div>
      </div>
    </div>
  );
}
