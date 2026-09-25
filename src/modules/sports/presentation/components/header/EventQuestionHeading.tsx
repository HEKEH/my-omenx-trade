import { Clock } from "lucide-react-sports";
import { marketKindLabel, questionLeagueKey, type SportsMarket } from "../../../domain";
import { LeagueBadge } from "../league/LeagueBadge";

/** Text-first heading for events without a two-team fixture (reference event/EventQuestionHeading.tsx). */
export function EventQuestionHeading({ market }: { market: SportsMarket }) {
  return (
    <div className="flex min-h-[176px] flex-1 flex-col justify-center px-8 py-8 md:px-12 md:py-10">
      <div className="flex items-center gap-2.5">
        <LeagueBadge league={questionLeagueKey(market.league.short)} size="sm" showLabel={false} />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{market.league.name}</span>
        <span aria-hidden className="text-muted-foreground/40">
          ·
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{marketKindLabel(market)}</span>
      </div>

      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">{market.title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          {market.endsLabel}
        </span>
        <span aria-hidden className="text-muted-foreground/40">
          ·
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-win opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-win shadow-[0_0_8px_currentColor]" />
          </span>
          <span className="uppercase tracking-[0.18em] text-foreground/80">Open</span>
        </span>
      </div>
    </div>
  );
}
