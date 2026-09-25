"use client";

import { useState } from "react";
import { ChevronDown, Equal } from "lucide-react-sports";
import {
  cents,
  delta24hCents,
  isBinaryMarket,
  isDrawOutcome,
  noCents,
  outcomeColor,
  outcomeName,
  type ChartPosition,
  type Outcome,
  type SportsMarket,
  type YesNo,
} from "../../../domain";
import { cn } from "../../cn";
import { formatDeltaCents } from "../../format";
import { CombinedPriceChart } from "../chart/CombinedPriceChart";
import { OrderBook } from "../orderbook/OrderBook";

export interface OutcomesPanelProps {
  market: SportsMarket;
  selectedIdx: number;
  tradeSide: YesNo;
  onSelect: (index: number) => void;
  /** A row's YES / NO button (3+ outcomes). */
  onSideSelect: (index: number, side: YesNo) => void;
  chartPositions?: ChartPosition[];
  onClosePosition?: (index: number) => void;
}

/**
 * Price chart above the list of outcomes (dev reference §5.5, reference
 * event/EventOutcomesPanel.tsx). Binary events list both sides with one Trade button and a
 * shared book; 3+ outcomes get YES / NO buttons and an inline book per row.
 */
export function OutcomesPanel(props: OutcomesPanelProps) {
  const { market, selectedIdx, onSelect, chartPositions, onClosePosition } = props;
  const selected = market.outcomes[selectedIdx] ?? market.outcomes[0];
  const chart = (
    <CombinedPriceChart
      market={market}
      highlightedOutcomeId={selected?.id}
      onLegendSelect={(id) => {
        const index = market.outcomes.findIndex((o) => o.id === id);
        if (index >= 0) onSelect(index);
      }}
      positions={chartPositions}
      onClosePosition={onClosePosition}
    />
  );
  return isBinaryMarket(market) ? <BinaryOutcomes {...props} chart={chart} /> : <MultiOutcomes {...props} chart={chart} />;
}

function BinaryOutcomes({ market, selectedIdx, onSelect, chart }: OutcomesPanelProps & { chart: React.ReactNode }) {
  const [a, b] = market.outcomes;
  return (
    <div className="space-y-4">
      {chart}
      <div className="rounded-2xl border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between px-4 pt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span>Markets</span>
          <span>2 sides · same event</span>
        </div>
        <div className="divide-y divide-border/70">
          {market.outcomes.map((o, index) => (
            <BinaryRow key={o.id} outcome={o} index={index} selected={index === selectedIdx} onSelect={() => onSelect(index)} />
          ))}
        </div>
        <div className="border-t border-border/70 p-4">
          <OrderBook mark={cents(a.price)} sideLabels={{ yes: outcomeName(a), no: outcomeName(b) }} />
        </div>
      </div>
    </div>
  );
}

function BinaryRow({ outcome, index, selected, onSelect }: { outcome: Outcome; index: number; selected: boolean; onSelect: () => void }) {
  const price = cents(outcome.price);
  const label = outcomeName(outcome);
  return (
    <div className={cn(selected ? "bg-primary/[0.06]" : undefined)}>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-4 px-4 py-3 text-left transition outline-none",
          "hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-primary/40",
        )}
      >
        <OutcomeLabel outcome={outcome} index={index} />
        <PriceWithDelta outcome={outcome} />
        <div className="flex shrink-0 items-center gap-2">
          {/* The first outcome is the green side, the second the red one; both are equally tradable. */}
          <TradeButton
            className="min-w-[112px]"
            tone={index === 0 ? "yes" : "no"}
            active={selected}
            ariaLabel={`Trade ${label} at ${price}¢`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            <span className="truncate">Trade</span>
            <span className="ml-1.5 tabular-nums opacity-80">{price}¢</span>
          </TradeButton>
        </div>
      </div>
    </div>
  );
}

function MultiOutcomes({ market, selectedIdx, tradeSide, onSideSelect, chart }: OutcomesPanelProps & { chart: React.ReactNode }) {
  // One row open at a time; it follows the selection.
  const [expandedIdx, setExpandedIdx] = useState(selectedIdx);
  const [trackedIdx, setTrackedIdx] = useState(selectedIdx);
  if (trackedIdx !== selectedIdx) {
    setTrackedIdx(selectedIdx);
    setExpandedIdx(selectedIdx);
  }

  return (
    <div className="space-y-4">
      {chart}
      <div className="rounded-2xl border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between px-4 pt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span>Markets</span>
          <span>{market.outcomes.length} markets</span>
        </div>
        <div className="divide-y divide-border/70">
          {market.outcomes.map((o, index) => (
            <OutcomeRow
              key={o.id}
              outcome={o}
              index={index}
              selected={index === selectedIdx}
              expanded={index === expandedIdx}
              activeSide={index === selectedIdx ? tradeSide : undefined}
              onToggleExpand={() => setExpandedIdx((prev) => (prev === index ? -1 : index))}
              onBuy={(side) => onSideSelect(index, side)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OutcomeRow({
  outcome,
  index,
  selected,
  expanded,
  activeSide,
  onToggleExpand,
  onBuy,
}: {
  outcome: Outcome;
  index: number;
  selected: boolean;
  expanded: boolean;
  activeSide?: YesNo;
  onToggleExpand: () => void;
  onBuy: (side: YesNo) => void;
}) {
  const yes = cents(outcome.price);
  const label = outcomeName(outcome);
  return (
    <div className={cn(selected ? "bg-primary/[0.06]" : undefined)}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        aria-expanded={expanded}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-4 px-4 py-3 text-left transition outline-none",
          "hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-primary/40",
        )}
      >
        <OutcomeLabel outcome={outcome} index={index} />
        <PriceWithDelta outcome={outcome} />
        <div className="flex shrink-0 items-center gap-2">
          {(["yes", "no"] as const).map((side) => (
            <TradeButton
              key={side}
              className="min-w-[68px]"
              tone={side}
              active={selected && activeSide === side}
              onClick={(e) => {
                e.stopPropagation();
                onBuy(side);
              }}
            >
              <span>{side === "yes" ? "YES" : "NO"}</span>
              <span className="ml-1.5 tabular-nums opacity-80">{side === "yes" ? yes : noCents(yes)}¢</span>
            </TradeButton>
          ))}
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180 text-foreground")} />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          <OrderBook mark={yes} sideLabels={{ yes: `${label} YES`, no: `${label} NO` }} />
        </div>
      )}
    </div>
  );
}

/** Glyph + name (+ meta) on the left of a row. */
function OutcomeLabel({ outcome, index }: { outcome: Outcome; index: number }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Glyph outcome={outcome} color={outcomeColor(outcome, index)} />
      <div className="min-w-0">
        <div className="truncate font-display text-sm font-semibold text-foreground">{outcomeName(outcome)}</div>
        {outcome.meta && <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{outcome.meta}</div>}
      </div>
    </div>
  );
}

/** The big ¢ price and the 24h change. */
function PriceWithDelta({ outcome }: { outcome: Outcome }) {
  const delta = delta24hCents(outcome);
  return (
    <div className="flex w-24 items-baseline justify-end gap-1.5">
      <span className="font-display text-2xl font-bold tabular-nums text-foreground">
        {cents(outcome.price)}
        <span className="text-sm text-muted-foreground">¢</span>
      </span>
      <span
        className={cn(
          "inline-block w-10 text-right font-mono text-[10px] tabular-nums",
          delta > 0 && "text-win",
          delta < 0 && "text-loss",
          delta === 0 && "text-muted-foreground",
        )}
      >
        {formatDeltaCents(delta)}
      </span>
    </div>
  );
}

function TradeButton({
  tone,
  active,
  className,
  ariaLabel,
  onClick,
  children,
}: {
  tone: YesNo;
  active: boolean;
  className: string;
  ariaLabel?: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        className,
        "rounded-md px-3 py-1.5 text-center font-mono text-[11px] font-semibold uppercase tracking-widest transition",
        tone === "yes"
          ? active
            ? "bg-win text-background ring-1 ring-win"
            : "bg-win/15 text-win ring-1 ring-win/30 hover:bg-win/25"
          : active
            ? "bg-loss text-background ring-1 ring-loss"
            : "bg-loss/15 text-loss ring-1 ring-loss/30 hover:bg-loss/25",
      )}
    >
      {children}
    </button>
  );
}

function Glyph({ outcome, color }: { outcome: Outcome; color: string }) {
  if (outcome.team) {
    return (
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.05] p-1 ring-1 ring-white/10" style={{ boxShadow: `0 0 14px -4px ${color}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>, as on the reference */}
        <img src={outcome.team.logo} alt="" className="h-full w-full object-contain" />
      </div>
    );
  }
  const tinted = { background: `color-mix(in oklab, ${color} 18%, transparent)`, color, boxShadow: `0 0 12px -4px ${color}` };
  if (isDrawOutcome(outcome)) {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={tinted}>
        <Equal className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold" style={tinted}>
      {outcome.label.charAt(0).toUpperCase()}
    </span>
  );
}
