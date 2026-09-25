import { outcomeAlias, type SportsMarket } from "../market";
import type { ChartPosition } from "../portfolio";

export const CHART_RANGES = ["1H", "6H", "1D", "1W", "ALL"] as const;
export type ChartRange = (typeof CHART_RANGES)[number];
export const DEFAULT_CHART_RANGE: ChartRange = "1D";

/** 0..99 seed from a string (reference CombinedPriceChart.tsx hashSeed). */
export function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 100;
}

/** Deterministic mock history in ¢ whose last point is the live price (CombinedPriceChart.tsx genSeries). */
export function genSeries(seed: number, endPrice: number, n = 60): number[] {
  const out: number[] = [];
  let p = endPrice * 100 * 0.7 + (seed % 25);
  for (let i = 0; i < n; i++) {
    const s = Math.sin((i + seed) * 0.37) * 3;
    const r = ((seed * (i + 7)) % 7) - 3;
    p = Math.max(2, Math.min(98, p + s * 0.4 + r * 0.5));
    out.push(Number(p.toFixed(2)));
  }
  out[out.length - 1] = Math.round(endPrice * 100);
  return out;
}

export interface OutcomeSeries {
  id: string;
  /** Team alias or label. */
  label: string;
  /** Position in market.outcomes, for the colour. */
  outcomeIndex: number;
  values: number[];
}

/** One series per outcome for a range; each range shifts the seed by 13. */
export function priceSeries(market: SportsMarket, range: ChartRange): OutcomeSeries[] {
  const bump = CHART_RANGES.indexOf(range);
  return market.outcomes.map((o, outcomeIndex) => ({
    id: o.id,
    label: outcomeAlias(o),
    outcomeIndex,
    values: genSeries(hashSeed(`${market.id}:${o.id}`) + bump * 13, o.price),
  }));
}

export interface OverlayRow extends ChartPosition {
  outcomeIndex: number;
  /** Entry on the chart's YES axis: NO entries plot at 100 − entry. */
  yChart: number;
  /** Distance of the rail from the top of the plot, in percent. */
  topPct: number;
}

/** Chart overlay rows, top-down so overlapping chips read in order (CombinedPriceChart.tsx:134-149). */
export function chartOverlay(positions: readonly ChartPosition[], market: SportsMarket): OverlayRow[] {
  return positions
    .map((p) => {
      const outcomeIndex = market.outcomes.findIndex((o) => o.id === p.outcomeId);
      if (outcomeIndex < 0) return null;
      const yChart = p.side === "yes" ? p.entry : 100 - p.entry;
      return { ...p, outcomeIndex, yChart, topPct: Math.max(0, Math.min(100, 100 - yChart)) };
    })
    .filter((row): row is OverlayRow => row !== null)
    .sort((a, b) => b.yChart - a.yChart);
}
