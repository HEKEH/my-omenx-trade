import { buildOrderBook, type BookRow } from "../../../domain";
import { cn } from "../../cn";
import { formatInteger } from "../../format";

const ASK_COLOR = "oklch(0.7 0.22 25)";
const BID_COLOR = "oklch(0.78 0.18 155)";

/**
 * YES and NO books side by side; the NO book mirrors the YES book (dev reference §5.5,
 * reference OrderBook.tsx). Colours are the reference's literal oklch values.
 */
export function OrderBook({ mark, sideLabels, className }: { mark: number; sideLabels?: { yes: string; no: string }; className?: string }) {
  const book = buildOrderBook({ mark });
  const yesHeader = sideLabels ? `${sideLabels.yes} Book` : "YES Book";
  const noHeader = sideLabels ? `${sideLabels.no} Book` : "NO Book";
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-4 shadow-card", className)}>
      <div className="flex items-center justify-between px-2 pb-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Order Book</div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Price · Size · Total</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-widest text-[oklch(0.85_0.16_155)]">{yesHeader}</div>
          <HalfSide rows={book.yes.asks} tone="ask" accumulate="left" />
          <SpreadDivider last={book.yes.last} spread={book.yes.spread} align="left" />
          <HalfSide rows={book.yes.bids} tone="bid" accumulate="left" />
        </div>
        <div>
          <div className="px-2 pb-1.5 text-right text-[10px] font-mono uppercase tracking-widest text-[oklch(0.85_0.16_155)]">{noHeader}</div>
          <HalfSide rows={book.no.asks} tone="ask" accumulate="right" />
          <SpreadDivider last={book.no.last} spread={book.no.spread} align="right" />
          <HalfSide rows={book.no.bids} tone="bid" accumulate="right" />
        </div>
      </div>
    </div>
  );
}

function HalfSide({ rows, tone, accumulate }: { rows: BookRow[]; tone: "ask" | "bid"; accumulate: "left" | "right" }) {
  if (rows.length === 0) return null;
  const color = tone === "ask" ? ASK_COLOR : BID_COLOR;
  const priceClass = tone === "ask" ? "text-[oklch(0.82_0.16_25)]" : "text-[oklch(0.85_0.16_155)]";
  return (
    <div className="space-y-0.5">
      {rows.map((r, i) => (
        <div key={i} className="relative grid grid-cols-3 items-center px-2 py-1 text-[11px] font-mono tabular-nums">
          <div
            className="absolute inset-y-0 opacity-[0.12]"
            style={{ background: color, width: `${r.depthPct}%`, [accumulate === "left" ? "left" : "right"]: 0 }}
          />
          <span className={cn("relative", priceClass, accumulate === "right" && "text-right")}>{r.price}¢</span>
          <span className="relative text-center text-foreground">{formatInteger(r.size)}</span>
          <span className={cn("relative text-muted-foreground", accumulate === "right" ? "text-left" : "text-right")}>{formatInteger(r.total)}</span>
        </div>
      ))}
    </div>
  );
}

function SpreadDivider({ last, spread, align }: { last: number; spread: number; align: "left" | "right" }) {
  return (
    <div
      className={cn(
        "my-1 flex items-center gap-2 border-y border-white/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground",
        align === "right" && "justify-end",
      )}
    >
      <span>
        Last <span className="text-foreground tabular-nums">{last}¢</span>
      </span>
      <span className="opacity-40">·</span>
      <span>
        Spread <span className="text-foreground tabular-nums">{spread}¢</span>
      </span>
    </div>
  );
}
