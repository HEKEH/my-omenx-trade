import Link from "next/link";
import type { SportsMarket } from "../../../domain";
import { cn } from "../../cn";

/** Chips linking to other events that share a team; hidden when there are none (dev reference §5.8). */
export function RelatedMarketsBar({ markets, className }: { markets: SportsMarket[]; className?: string }) {
  if (markets.length === 0) return null;
  return (
    <div className={cn("rounded-2xl border border-border bg-surface px-3 py-2.5 shadow-card", className)}>
      <div className="flex items-center gap-2">
        <span className="shrink-0 px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Related events</span>
        <div className="-mx-1 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {markets.map((m) => (
            <Link
              key={m.id}
              href={`/sports/event/${m.id}`}
              className="shrink-0 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-white/10 transition-colors hover:bg-white/[0.08] hover:text-foreground"
            >
              {m.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
