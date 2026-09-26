"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "../../../domain";
import { cn } from "../../cn";
import { formatInteger } from "../../format";

export interface CandlePriceLine {
  key: string;
  /** ¢ on this outcome's YES axis. */
  price: number;
  color: string;
  title: string;
}

// lightweight-charts plots UTC; shifting by the local offset makes its axis read local time.
const tzShift = () => -new Date().getTimezoneOffset() * 60;
const toChartTime = (sec: number) => (sec + tzShift()) as UTCTimestamp;
const clock = (time: number) => new Date(time * 1000).toISOString().slice(11, 19);

/** The canvas needs plain colours: resolve theme variables and oklch() through a 1px canvas. */
function resolveColor(color: string, from: HTMLElement): string {
  const value = color.startsWith("--") ? getComputedStyle(from).getPropertyValue(color).trim() : color;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return value;
  ctx.fillStyle = "#000";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

const withAlpha = (rgba: string, alpha: number) => rgba.replace(/[\d.]+\)$/, `${alpha})`);

/**
 * Candlestick chart of one outcome's simulated live price with volume bars (dev reference
 * §11). `dataKey` changes when the outcome or interval does: the series is reloaded and
 * scrolled to the latest candle; otherwise only candles from the last drawn one on are
 * updated, so a user scrolled back stays where they are.
 */
export function LiveCandleChart({
  candles,
  dataKey,
  intervalSec,
  priceLines,
  className,
}: {
  candles: Candle[];
  dataKey: string;
  intervalSec: number;
  priceLines: CandlePriceLine[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{ chart: IChartApi; candle: ISeriesApi<"Candlestick">; volume: ISeriesApi<"Histogram">; win: string; loss: string } | null>(
    null,
  );
  const drawn = useRef<{ key: string; lastTime: number; count: number }>({ key: "", lastTime: 0, count: 0 });
  const byTime = useRef(new Map<number, Candle>());
  const [hover, setHover] = useState<Candle | null>(null);
  const [detached, setDetached] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const muted = resolveColor("--muted-foreground", el);
    const border = resolveColor("--border", el);
    const win = resolveColor("--win", el);
    const loss = resolveColor("--loss", el);
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor: muted, fontFamily: getComputedStyle(el).fontFamily, fontSize: 10 },
      grid: { vertLines: { color: withAlpha(border, 0.04) }, horzLines: { color: withAlpha(border, 0.06) } },
      rightPriceScale: { borderColor: border },
      timeScale: { borderColor: border, timeVisible: true, rightOffset: 3, shiftVisibleRangeOnNewBar: true },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { timeFormatter: (time: number) => clock(time), priceFormatter: (p: number) => `${p.toFixed(1)}¢` },
    });
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: win,
      downColor: loss,
      borderUpColor: win,
      borderDownColor: loss,
      wickUpColor: win,
      wickDownColor: loss,
      priceFormat: { type: "custom", minMove: 0.1, formatter: (p: number) => `${p.toFixed(1)}¢` },
    });
    const volume = chart.addSeries(HistogramSeries, { priceScaleId: "volume", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    chartRef.current = { chart, candle, volume, win, loss };

    chart.subscribeCrosshairMove((param) => {
      const point = param.time !== undefined ? byTime.current.get(param.time as number) : undefined;
      setHover(point ?? null);
    });
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      setDetached(range !== null && range.to < drawn.current.count - 1.5);
    });
    return () => {
      chart.remove();
      chartRef.current = null;
      drawn.current = { key: "", lastTime: 0, count: 0 };
    };
  }, []);

  useEffect(() => {
    const c = chartRef.current;
    if (!c) return;
    c.chart.applyOptions({ timeScale: { secondsVisible: intervalSec < 60 } });
  }, [intervalSec]);

  useEffect(() => {
    const c = chartRef.current;
    if (!c || candles.length === 0) return;
    const toCandle = (k: Candle): CandlestickData => ({ time: toChartTime(k.time), open: k.open, high: k.high, low: k.low, close: k.close });
    const toVolume = (k: Candle): HistogramData => ({
      time: toChartTime(k.time),
      value: k.volume,
      color: withAlpha(k.close >= k.open ? c.win : c.loss, 0.35),
    });
    const remember = (k: Candle) => byTime.current.set(toChartTime(k.time), k);

    if (drawn.current.key !== dataKey) {
      byTime.current.clear();
      candles.forEach(remember);
      c.candle.setData(candles.map(toCandle));
      c.volume.setData(candles.map(toVolume));
      c.chart.timeScale().fitContent();
      drawn.current = { key: dataKey, lastTime: candles[candles.length - 1].time, count: candles.length };
      return;
    }
    for (const k of candles) {
      if (k.time < drawn.current.lastTime) continue;
      if (k.time > drawn.current.lastTime) drawn.current.count += 1;
      remember(k);
      c.candle.update(toCandle(k));
      c.volume.update(toVolume(k));
      drawn.current.lastTime = k.time;
    }
  }, [candles, dataKey]);

  useEffect(() => {
    const c = chartRef.current;
    if (!c) return;
    const el = containerRef.current!;
    const lines: IPriceLine[] = priceLines.map((line) =>
      c.candle.createPriceLine({
        price: line.price,
        color: resolveColor(line.color, el),
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: true,
        title: line.title,
      }),
    );
    // On unmount the chart is removed first (effects clean up in order); its lines go with it.
    return () => {
      if (chartRef.current === c) lines.forEach((line) => c.candle.removePriceLine(line));
    };
  }, [priceLines]);

  const last = candles[candles.length - 1];
  const shown = hover ?? last;

  return (
    <div className={cn("relative h-full w-full", className)}>
      <div ref={containerRef} className="h-full w-full" />
      {shown && (
        <div className="pointer-events-none absolute left-1 top-0 flex flex-wrap items-center gap-x-2 font-mono text-[10px] tabular-nums text-muted-foreground">
          <span className="text-foreground/80">{clock(shown.time + tzShift())}</span>
          {(["open", "high", "low", "close"] as const).map((k) => (
            <span key={k}>
              {k[0].toUpperCase()}{" "}
              <span className={shown.close >= shown.open ? "text-win" : "text-loss"}>{shown[k].toFixed(1)}</span>
            </span>
          ))}
          <span>
            Vol <span className="text-foreground/80">{formatInteger(shown.volume)}</span>
          </span>
        </div>
      )}
      {detached && (
        <button
          type="button"
          onClick={() => chartRef.current?.chart.timeScale().scrollToRealTime()}
          className="absolute bottom-8 right-16 rounded-full bg-surface-elevated/95 px-2.5 py-1 font-mono text-[10px] text-foreground shadow-card ring-1 ring-border hover:bg-white/10"
        >
          Back to live →
        </button>
      )}
    </div>
  );
}

