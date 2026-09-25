import type { LeagueKey } from "../../../domain";
import { cn } from "../../cn";

/**
 * League crests (reference LeagueBadge.tsx). EPL and UCL point at the reference's Lovable
 * asset paths, which 404 locally, so both pages show the same broken image (dev reference
 * E-15, BUG-2).
 */
const PRESETS: Record<LeagueKey, { label: string; logo: string }> = {
  epl: { label: "EPL", logo: "/__l5e/assets-v1/e7036c96-8f68-4270-86b9-1b1c731e7fee/epl.svg" },
  laliga: { label: "La Liga", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png" },
  ucl: { label: "UCL", logo: "/__l5e/assets-v1/bebeab9c-adf2-4cdb-89ca-ca74706fddc6/ucl.svg" },
  seriea: { label: "Serie A", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png" },
  mls: { label: "MLS", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/19.png" },
  nba: { label: "NBA", logo: "https://a.espncdn.com/i/leaguelogos/nba/500/nba.png" },
  wc: { label: "World Cup", logo: "/sports/leagues/world-cup-2026.png" },
};

export function LeagueBadge({
  league,
  size = "sm",
  showLabel = true,
  className,
}: {
  league: LeagueKey;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const preset = PRESETS[league];
  const dim = size === "sm" ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-[11px]";
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/10", dim)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>, as on the reference */}
        <img src={preset.logo} alt="" loading="lazy" className="h-[78%] w-[78%] object-contain" />
      </span>
      {showLabel && <span className="text-xs text-muted-foreground font-medium">{preset.label}</span>}
    </div>
  );
}
