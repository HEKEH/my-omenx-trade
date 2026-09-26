"use client";

import { useMemo, useState } from "react";
import { ChartCandlestick, ChartLine, X } from "lucide-react-sports";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  buildCandles,
  CANDLE_INTERVAL_SECONDS,
  CANDLE_INTERVALS,
  CANDLE_WINDOW,
  CHART_RANGES,
  chartOverlay,
  DEFAULT_CANDLE_INTERVAL,
  DEFAULT_CHART_RANGE,
  isLiveMarket,
  outcomeColor,
  priceSeries,
  type CandleInterval,
  type ChartPosition,
  type ChartRange,
  type OverlayRow,
  type SportsMarket,
} from "../../../domain";
import { cn } from "../../cn";
import { formatChipPnl, formatInteger } from "../../format";
import { useLiveTrades } from "../../hooks/useLiveTrades";
import { LiveCandleChart, type CandlePriceLine } from "./LiveCandleChart";

type ChartMode = "line" | "candles";

/**
 * Every outcome's price history on one chart, with range pills, a clickable legend and a
 * TradingView-style overlay of open positions (dev reference §5.5, reference
 * event/CombinedPriceChart.tsx). Candles mode (§11, not on the reference) shows the
 * highlighted outcome's simulated live price at 1s–1m; the legend picks the outcome.
 */
export function CombinedPriceChart({
  market,
  highlightedOutcomeId,
  onLegendSelect,
  positions,
  onClosePosition,
  className,
}: {
  market: SportsMarket;
  highlightedOutcomeId?: string;
  onLegendSelect?: (outcomeId: string) => void;
  positions?: ChartPosition[];
  /** Closes the position at this index of the positions list. */
  onClosePosition?: (index: number) => void;
  className?: string;
}) {
  const [range, setRange] = useState<ChartRange>(DEFAULT_CHART_RANGE);
  const [mode, setMode] = useState<ChartMode>("line");
  const [candleInterval, setCandleInterval] = useState<CandleInterval>(DEFAULT_CANDLE_INTERVAL);
  const charted = market.outcomes.find((o) => o.id === highlightedOutcomeId) ?? market.outcomes[0];
  const seedKey = `${market.id}:${charted.id}`;
  const intervalSec = CANDLE_INTERVAL_SECONDS[candleInterval];
  const feed = useLiveTrades({ seedKey, basePrice: charted.price * 100, live: isLiveMarket(market), enabled: mode === "candles" });
  const candles = useMemo(
    () => (feed.now ? buildCandles(feed.trades, { intervalSec, endMs: feed.now, count: CANDLE_WINDOW, fallbackPrice: charted.price * 100 }) : []),
    [feed, intervalSec, charted.price],
  );

  const { data, perOutcome } = useMemo(() => {
    const series = priceSeries(market, range).map((s) => ({ ...s, color: outcomeColor(market.outcomes[s.outcomeIndex], s.outcomeIndex) }));
    const rows = (series[0]?.values ?? []).map((_, i) => {
      const row: Record<string, number> = { t: i };
      for (const s of series) row[s.id] = s.values[i];
      return row;
    });
    return { data: rows, perOutcome: series };
  }, [market, range]);

  const overlay = useMemo(
    () =>
      chartOverlay(positions ?? [], market).map((row) => ({
        ...row,
        color: outcomeColor(market.outcomes[row.outcomeIndex], row.outcomeIndex),
      })),
    [positions, market],
  );
  // Positions on the charted outcome, on its YES axis (a NO entry plots at 100 − entry).
  const priceLines = useMemo<CandlePriceLine[]>(
    () =>
      overlay
        .filter((row) => row.outcomeId === charted.id)
        .map((row) => ({
          key: String(row.index),
          price: row.yChart,
          color: row.color,
          title: `${row.side === "yes" ? "YES" : "NO"} ${formatChipPnl(row.pnl)}`,
        })),
    [overlay, charted.id],
  );

  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-5 shadow-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{mode === "line" ? "Price history" : "Live price"}</div>
          <div className="mt-1 font-display text-sm text-foreground/80">
            {mode === "line" ? (
              "All outcomes"
            ) : (
              <>
                {perOutcome.find((s) => s.id === charted.id)?.label}
                <span className="ml-2 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  Simulated
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/5">
            {(
              [
                ["line", ChartLine, "Line chart"],
                ["candles", ChartCandlestick, "Candles"],
              ] as const
            ).map(([m, Icon, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-label={label}
                aria-pressed={mode === m}
                title={label}
                className={cn(
                  "grid h-[22px] w-7 place-items-center rounded-full transition-colors",
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/5">
            {(mode === "line" ? CHART_RANGES : CANDLE_INTERVALS).map((r) => {
              const active = mode === "line" ? range === r : candleInterval === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => (mode === "line" ? setRange(r as ChartRange) : setCandleInterval(r as CandleInterval))}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 font-mono text-[11px] transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 h-56 w-full">
        {mode === "candles" ? (
          <LiveCandleChart candles={candles} dataKey={`${seedKey}:${candleInterval}`} intervalSec={intervalSec} priceLines={priceLines} />
        ) : (
          <div className="relative h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
                  contentStyle={{
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                  formatter={(v: number, name: string) => [`${Math.round(v)}¢`, perOutcome.find((s) => s.id === name)?.label ?? name]}
                  labelFormatter={() => ""}
                />
                {perOutcome.map((s) => {
                  const dimmed = highlightedOutcomeId && highlightedOutcomeId !== s.id;
                  return (
                    <Line
                      key={s.id}
                      type="monotone"
                      dataKey={s.id}
                      stroke={s.color}
                      strokeWidth={dimmed ? 1.25 : 2.25}
                      strokeOpacity={dimmed ? 0.45 : 1}
                      dot={false}
                      isAnimationActive={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
            {/* Sits over the plot; top 8px matches the chart's top margin so the rails line up. */}
            {overlay.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0" style={{ top: 8, bottom: 0, right: 8 }}>
                {overlay.map((row) => (
                  <PositionOverlayRow key={row.index} row={row} onClose={onClosePosition ? () => onClosePosition(row.index) : undefined} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {perOutcome.map((s) => {
          const dim = highlightedOutcomeId && highlightedOutcomeId !== s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onLegendSelect?.(s.id)}
              className={cn(
                "group inline-flex items-center gap-1.5 text-[11px] font-mono transition-opacity",
                dim ? "opacity-55 hover:opacity-100" : "opacity-100",
              )}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
              <span className="text-foreground">{s.label}</span>
              <span className="tabular-nums text-muted-foreground">{s.values[s.values.length - 1]}¢</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PositionOverlayRow({ row, onClose }: { row: OverlayRow & { color: string }; onClose?: () => void }) {
  const sideLabel = row.side === "yes" ? "YES" : "NO";
  return (
    <div className="absolute inset-x-0 flex items-center" style={{ top: `${row.topPct}%`, transform: "translateY(-50%)" }}>
      <div className="h-px flex-1 border-t border-dashed" style={{ borderColor: row.color, opacity: 0.55 }} />
      <div
        className="pointer-events-auto ml-1 flex shrink-0 items-stretch overflow-hidden rounded-md border bg-surface-elevated/95 shadow-card backdrop-blur"
        style={{ borderColor: `color-mix(in oklab, ${row.color} 55%, transparent)` }}
        title={`${row.outcomeLabel} ${sideLabel} · ${formatInteger(row.size)} @ ${row.entry}¢`}
      >
        <div
          className="flex flex-col justify-center px-1.5 py-1 font-mono leading-none"
          style={{ background: `color-mix(in oklab, ${row.color} 12%, transparent)` }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: row.color }}>
            {row.outcomeLabel} {sideLabel}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-foreground">{Math.round(row.entry)}¢</span>
        </div>
        <div className="flex flex-col justify-center border-l border-border/70 px-1.5 py-1 font-mono leading-none">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">P/L</span>
          <span className={cn("mt-0.5 text-[10px] font-semibold tabular-nums", row.pnl >= 0 ? "text-win" : "text-loss")}>
            {formatChipPnl(row.pnl)}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${row.outcomeLabel} ${sideLabel} position`}
            className="grid w-6 shrink-0 place-items-center border-l border-border/70 text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
