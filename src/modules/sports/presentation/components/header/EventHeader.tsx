import type { SportsMarket } from "../../../domain";
import { EventQuestionHeading } from "./EventQuestionHeading";
import { LiveDelayInfo } from "./LiveDelayInfo";
import { ShareButton } from "./ShareButton";

/** Atmospheric background per competition, keyed by league short (reference lib/league-backgrounds.ts). */
const LEAGUE_BG: Record<string, string> = {
  WC: "/sports/league-bg/wc.jpg",
  UCL: "/sports/league-bg/ucl.jpg",
  EPL: "/sports/league-bg/epl.jpg",
  LL: "/sports/league-bg/ll.jpg",
  MLS: "/sports/league-bg/mls.jpg",
};

/**
 * Event hero (dev reference §5.2, reference event.$id.tsx:663-816): crests with the live
 * score or kickoff for fixtures, a question heading otherwise, and the volume / players stats.
 */
export function EventHeader({ market, outcomeId }: { market: SportsMarket; outcomeId?: string }) {
  const fixture = market.fixture;
  const leagueBg = fixture ? LEAGUE_BG[market.league.short] : undefined;
  const liveScore = market.isLiveStream && fixture ? market.liveScore : undefined;

  return (
    <header className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
      {leagueBg ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>, as on the reference */}
          <img aria-hidden src={leagueBg} alt="" loading="lazy" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface/60 via-surface/80 to-surface" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-surface/70 via-transparent to-surface/70" />
        </>
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-ambient" />
      )}

      <div className="absolute right-4 top-4 z-10">
        <ShareButton outcomeId={outcomeId} />
      </div>

      <div className="relative flex flex-col items-stretch md:flex-row">
        <div className="flex flex-1 flex-col">
          {fixture ? (
            <div className="flex min-h-[176px] items-center justify-around gap-6 px-8 py-8 md:px-12 md:py-10">
              <CrestBlock name={fixture.home.name} logo={fixture.home.logo} />
              {liveScore ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary ring-1 ring-primary/30">
                    <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_8px_currentColor]" />
                    Live
                  </span>
                  <div className="flex items-baseline gap-3 font-display text-5xl font-semibold leading-none tabular-nums text-foreground md:text-6xl">
                    <span>{liveScore.home}</span>
                    <span className="text-foreground/30">–</span>
                    <span>{liveScore.away}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                    <span>Official scoring</span>
                    <LiveDelayInfo tone="muted" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="relative py-1">
                    <span className="select-none font-serif-display text-5xl italic leading-none tracking-tighter text-foreground/20">vs</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-10 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />
                    </div>
                  </div>
                  <div className="mt-3 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5">
                    <span className="whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                      {fixture.kickoff} · {fixture.whenLabel}
                    </span>
                  </div>
                </div>
              )}
              <CrestBlock name={fixture.away.name} logo={fixture.away.logo} />
            </div>
          ) : (
            <EventQuestionHeading market={market} />
          )}
        </div>

        <div aria-hidden className="hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent md:my-8 md:block" />

        <div className="flex w-full flex-row justify-around gap-6 border-t border-white/5 bg-white/[0.01] px-8 py-5 md:w-52 md:flex-col md:justify-center md:gap-5 md:border-t-0 md:px-7 md:pb-8 md:pt-14">
          <StatBlock label="Total Volume" value={market.volume} />
          <StatBlock label="Live Players" value={market.participants.toLocaleString("en-US")} pulse />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </header>
  );
}

function StatBlock({ label, value, pulse }: { label: string; value: string; pulse?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {pulse ? <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-win shadow-[0_0_10px_currentColor]" /> : null}
        <p className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/70">{label}</p>
      </div>
      <p className="font-mono text-lg font-medium tracking-tight text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function CrestBlock({ name, logo }: { name: string; logo: string }) {
  return (
    <div className="group flex flex-col items-center gap-4">
      <div className="relative">
        <div className="absolute inset-0 scale-125 rounded-full bg-primary/30 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative grid h-20 w-28 place-items-center overflow-hidden rounded-xl bg-white/[0.04] p-3 shadow-2xl ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105">
          {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>, as on the reference */}
          <img src={logo} alt={name} className="h-full w-full object-contain" />
        </div>
      </div>
      <div className="max-w-[140px] text-center font-display text-[12px] font-black uppercase tracking-[0.22em] text-foreground/90">{name}</div>
    </div>
  );
}
