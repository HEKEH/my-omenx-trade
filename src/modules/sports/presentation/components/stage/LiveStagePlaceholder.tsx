import type { SportsMarket } from "../../../domain";

/**
 * Stands in for the live broadcast stage (dev reference B-5, §5.4): the same 16:9 frame as the
 * reference's EventLiveStage, without the video, controls or scoreboard.
 */
export function LiveStagePlaceholder({ market }: { market: SportsMarket }) {
  const fixture = market.fixture;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[color:var(--accent)]/40 bg-black shadow-card ring-1 ring-[color:var(--accent)]/20">
      <div className="relative aspect-[16/9] w-full">
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-white/[0.08] to-transparent">
          <div className="text-center">
            <div className="font-mono text-[11px] uppercase tracking-widest text-white/60">Live stream</div>
            <div className="mt-1 font-display text-sm text-white/40">
              {fixture ? `${fixture.home.name} vs ${fixture.away.name}` : market.title}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
