"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner-sports";
import {
  buildPlacedOrder,
  ctaLabel,
  DEFAULT_MARGIN,
  formCta,
  LEVERAGE_MAX,
  LEVERAGE_MIN,
  orderProblem,
  parseMarginInput,
  parseTpSlInput,
  previewTpSlPnl,
  QUICK_MARGIN_PCTS,
  quickMargin,
  quoteOrder,
  REFERENCE_FORM_BALANCE,
  validateTpSl,
  type OrderSide,
  type OrderType,
  type PlacedOrder,
  type YesNo,
} from "../../../domain";
import { cn } from "../../cn";
import { formatInteger } from "../../format";
import { Slider } from "../../ui/slider";
import { Switch } from "../../ui/switch";

/**
 * Order ticket (dev reference §5.7, reference TradeForm.tsx): side, market / limit, margin with
 * quick percentages, leverage, optional TP / SL with PnL previews, the summary and the submit
 * button. The page remounts it (via `key`) when the outcome or side changes.
 */
export function TradeForm({
  outcome,
  outcomeLabel,
  price,
  balance = REFERENCE_FORM_BALANCE,
  onPlaceOrder,
  className,
}: {
  outcome: YesNo;
  outcomeLabel: string;
  /** Form price in ¢. */
  price: number;
  balance?: number;
  onPlaceOrder?: (order: PlacedOrder) => void;
  className?: string;
}) {
  const [side, setSide] = useState<OrderSide>("buy");
  const [type, setType] = useState<OrderType>("market");
  const [tpslOpen, setTpslOpen] = useState(false);
  const [margin, setMargin] = useState(DEFAULT_MARGIN);
  const [leverage, setLeverage] = useState(LEVERAGE_MIN);
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const [limit, setLimit] = useState(price.toString());

  const quote = quoteOrder({ type, price, limitInput: limit, margin, leverage, outcome, balance });
  const { px, notional, shares, fee, pnlAtSettle, liq } = quote;
  const tpNum = parseTpSlInput(tp);
  const slNum = parseTpSlInput(sl);
  const tpslInput = { side: outcome, entry: px, liq, leverage, tp: tpNum, sl: slNum };
  const { tpError, slError, hasError } = validateTpSl(tpslInput);
  const { tpPnl, slPnl } = previewTpSlPnl({ ...tpslInput, notional, fee });

  const baseLabel = ctaLabel({ side, label: outcomeLabel, leverage, px });
  const accentClass = outcome === "yes" ? "bg-primary text-primary-foreground" : "bg-gradient-neon text-white shadow-glow";
  const sideToneClass = (s: OrderSide) =>
    side === s
      ? outcome === "yes"
        ? "bg-primary/15 text-primary ring-1 ring-primary/30"
        : "bg-neon/15 text-neon ring-1 ring-neon/30"
      : "text-muted-foreground hover:text-foreground";

  const submit = () => {
    const problem = orderProblem({ hasTpSlError: hasError, margin, balance });
    if (problem === "tpsl") return void toast.error("Fix TP / SL before submitting");
    if (problem === "no-margin") return void toast.error("Set a margin amount");
    if (problem === "insufficient") {
      return void toast.error("Insufficient balance", { description: `Margin ${margin.toFixed(2)} > available ${balance.toFixed(2)} USDC` });
    }
    try {
      onPlaceOrder?.(buildPlacedOrder({ side, type, outcome, outcomeLabel, margin, leverage, quote, tp: tpNum, sl: slNum }));
    } catch (err) {
      toast.error("Order failed", { description: err instanceof Error ? err.message : "Unknown error" });
      return;
    }
    toast.success(`Order placed · ${baseLabel}`, { description: `Notional ${notional.toFixed(2)} USDC · Fee ${fee.toFixed(2)}` });
  };

  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-5 shadow-card", className)}>
      {/* Side toggle, tinted by the outcome rather than win / loss. */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/5">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={cn("rounded-lg py-2 text-xs font-display font-semibold uppercase tracking-widest transition-colors", sideToneClass(s))}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 border-b border-border pb-2 text-xs">
        {(["market", "limit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn("relative pb-2 font-medium capitalize transition-colors", type === t ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {t}
            {type === t && <span className="absolute -bottom-px left-0 right-0 h-px bg-gradient-neon" />}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {type === "limit" && (
          <Field label="Limit Price (¢)">
            <input
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full bg-transparent text-right font-mono text-lg tabular-nums outline-none"
            />
          </Field>
        )}
        <Field label="Margin (USDC)">
          <input
            type="number"
            value={margin}
            onChange={(e) => setMargin(parseMarginInput(e.target.value))}
            className="w-full bg-transparent text-right font-mono text-lg tabular-nums outline-none"
          />
        </Field>
        <div className="flex items-center gap-1.5">
          {QUICK_MARGIN_PCTS.map((pct) => (
            <button
              key={pct}
              onClick={() => setMargin(quickMargin(balance, pct))}
              className="flex-1 rounded-lg bg-white/[0.04] py-1.5 font-mono text-[11px] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-white/[0.02] px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Leverage</span>
          <span className="font-mono text-sm text-neon">{leverage}×</span>
        </div>
        <Slider value={[leverage]} onValueChange={([v]) => setLeverage(v)} min={LEVERAGE_MIN} max={LEVERAGE_MAX} step={1} className="mt-2" />
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span>1×</span>
          <span>
            Notional = {formatInteger(margin)} × {leverage} = <span className="text-foreground">{formatInteger(notional)} USDC</span>
          </span>
          <span>20×</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-white/[0.02] px-3 py-2.5">
        <div className="text-xs font-display font-semibold">TP/SL</div>
        <Switch checked={tpslOpen} onCheckedChange={setTpslOpen} />
      </div>

      {tpslOpen && (
        <div className="mt-4 space-y-4 rounded-xl border border-neon/20 bg-neon/[0.03] p-4">
          <div className="grid grid-cols-2 gap-2">
            <Field label="TP (¢)" compact error={tpError}>
              <input
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                placeholder="—"
                inputMode="decimal"
                className={cn("w-full bg-transparent text-right font-mono text-sm tabular-nums outline-none placeholder:text-muted-foreground", tpError && "text-loss")}
              />
            </Field>
            <Field label="SL (¢)" compact error={slError}>
              <input
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                placeholder="—"
                inputMode="decimal"
                className={cn("w-full bg-transparent text-right font-mono text-sm tabular-nums outline-none placeholder:text-muted-foreground", slError && "text-loss")}
              />
            </Field>
          </div>

          {(tpPnl !== null || slPnl !== null) && (
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <PnlPreview label="If TP hits" pnl={tpPnl} />
              <PnlPreview label="If SL hits" pnl={slPnl} />
            </div>
          )}
        </div>
      )}

      <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-[11px] font-mono">
        <SummaryRow label="Margin" value={`${margin.toFixed(2)} USDC`} />
        <SummaryRow label="Contracts" value={shares.toFixed(1)} />
        <SummaryRow
          label="Est. PnL @ settle"
          value={`${pnlAtSettle >= 0 ? "+" : ""}${pnlAtSettle.toFixed(2)} USDC`}
          highlight={pnlAtSettle >= 0 ? "win" : "loss"}
        />
      </dl>

      <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
        <button
          type="button"
          onClick={submit}
          disabled={hasError}
          className={cn(
            "w-full rounded-xl py-3 font-display font-semibold uppercase tracking-widest text-sm transition-opacity hover:opacity-90",
            hasError ? "cursor-not-allowed bg-white/[0.06] text-muted-foreground hover:opacity-100" : "",
            accentClass,
          )}
        >
          {formCta({ hasTpSlError: hasError, base: baseLabel })}
        </button>
      </div>
    </div>
  );
}

function Field({ label, compact, error, children }: { label: string; compact?: boolean; error?: string | null; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label
        className={cn(
          "flex items-center justify-between rounded-xl border bg-white/[0.02]",
          compact ? "px-3 py-1.5" : "px-3 py-2.5",
          error ? "border-loss/60" : "border-border",
        )}
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="flex-1 pl-3">{children}</div>
      </label>
      {error && <p className="px-1 text-[10px] font-mono text-loss">{error}</p>}
    </div>
  );
}

function PnlPreview({ label, pnl }: { label: string; pnl: number | null }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
      <div className="text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className={cn("mt-0.5 tabular-nums", pnl !== null ? (pnl >= 0 ? "text-win" : "text-loss") : "text-muted-foreground/50")}>
        {pnl !== null ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USDC` : "—"}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: "win" | "loss" }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums", highlight === "win" ? "text-win" : highlight === "loss" ? "text-loss" : "text-foreground")}>{value}</dd>
    </div>
  );
}
