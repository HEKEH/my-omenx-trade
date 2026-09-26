"use client";

import { useRef, useState } from "react";
import { ArrowLeftRight, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { OrderType, TpSlMode } from "../../../domain";
import { formatBalance } from "../../format";
import { useDismiss } from "../../hooks/useDismiss";
import type { TpSlPreview } from "../../hooks/useOrderPreview";
import type { InputMode } from "../../stores/tradeFormStore";

const LEVERAGE_PRESETS = [1, 2, 5, 7, 10];
const PERCENT_LABELS = ["0%", "25%", "50%", "75%", "100%"];

/** Only cross margin is supported; isolated is shown as unavailable. */
export function MarginModeSelect({ value }: { value: "Cross" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss([ref], open, () => setOpen(false));
  return (
    <div ref={ref} className="flex items-center justify-between relative">
      <span className="text-xs text-muted-foreground">Margin Mode</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded text-xs"
      >
        {value}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg min-w-[140px]">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={`w-full px-3 py-2 text-left text-xs hover:bg-muted transition-colors ${
              value === "Cross" ? "text-trading-purple" : "text-foreground"
            }`}
          >
            Cross
          </button>
          <div className="px-3 py-2 text-xs text-muted-foreground cursor-not-allowed flex items-center justify-between">
            <span>Isolated</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">Not Supported</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function LeverageControl({ value, onChange }: { value: number; onChange: (leverage: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Leverage</span>
        <span className="text-sm font-bold text-trading-purple">{value}x</span>
      </div>
      <Slider value={[value]} onValueChange={([next]) => onChange(next)} min={1} max={10} step={1} className="w-full" />
      <div className="flex gap-1.5">
        {LEVERAGE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`flex-1 py-1 text-xs rounded transition-colors ${
              value === preset ? "bg-trading-purple text-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {preset}x
          </button>
        ))}
      </div>
    </div>
  );
}

/** Real balance only (A-9). Deposits are out of scope, so the + button does nothing (A-2). */
export function AvailableBalance({ balance }: { balance: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">Available (USDC)</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs">{formatBalance(balance)}</span>
        <button
          type="button"
          className="w-5 h-5 bg-muted rounded-full flex items-center justify-center hover:bg-muted-foreground/30 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function OrderTypeTabs({ value, onChange }: { value: OrderType; onChange: (type: OrderType) => void }) {
  return (
    <div className="flex border-b border-border/30">
      {(["Limit", "Market"] as const).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={`px-2 py-1.5 text-xs font-medium transition-all ${
            value === type ? "text-foreground border-b-2 border-trading-purple" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
}

export function LimitPriceInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">Price</span>
      {/* mt-1: Tailwind 4's space-y skips an inline first child; this restores the v3 gap (R-6 ⑦). */}
      <div className="mt-1 flex items-center bg-muted rounded-lg px-2.5 py-2">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          // min-w-0: next/font's variable JetBrains Mono reports a wider average glyph than the
          // reference's static files, so the input's intrinsic width would overflow the row by 7px.
          className="flex-1 min-w-0 bg-transparent outline-hidden font-mono text-sm"
          placeholder="0.0000"
        />
        <span className="text-muted-foreground text-xs">USDC</span>
      </div>
    </div>
  );
}

export function SizeInput({
  value,
  mode,
  onChange,
  onToggleMode,
}: {
  value: string;
  mode: InputMode;
  onChange: (value: string) => void;
  onToggleMode: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{mode === "amount" ? "Amount" : "Qty"}</span>
        <button type="button" onClick={onToggleMode} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftRight className="w-3 h-3" />
        </button>
      </div>
      <div className="flex items-center bg-muted rounded-lg px-2.5 py-2">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          // min-w-0: see the price input above.
          className="flex-1 min-w-0 bg-transparent outline-hidden font-mono text-sm"
          placeholder="0.00"
        />
        {mode === "amount" && <span className="text-muted-foreground text-xs font-medium">USDC</span>}
      </div>
    </div>
  );
}

export function PercentSlider({ value, onChange }: { value: number; onChange: (percent: number) => void }) {
  return (
    <div className="space-y-1">
      <Slider value={[value]} onValueChange={([next]) => onChange(next)} max={100} step={1} className="w-full" />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {PERCENT_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function TpSlField({
  kind,
  value,
  mode,
  preview,
  onChange,
  onMode,
}: {
  kind: "tp" | "sl";
  value: string;
  mode: TpSlMode;
  preview: TpSlPreview | null;
  onChange: (value: string) => void;
  onMode: (mode: TpSlMode) => void;
}) {
  const tone = kind === "tp" ? "green" : "red";
  const modeClass = (active: boolean) =>
    `px-1.5 py-0.5 rounded text-[10px] transition-colors ${
      active ? (tone === "green" ? "bg-trading-green/20 text-trading-green" : "bg-trading-red/20 text-trading-red") : "text-muted-foreground"
    }`;
  return (
    <div className="space-y-1">
      <span className={`text-xs ${tone === "green" ? "text-trading-green" : "text-trading-red"}`}>
        {kind === "tp" ? "Take Profit" : "Stop Loss"}
      </span>
      <div className="mt-1 flex items-center bg-muted rounded-lg px-2.5 py-2 gap-1">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="flex-1 min-w-0 bg-transparent outline-hidden font-mono text-sm"
          placeholder={mode === "pct" ? "0" : "0.0000"}
        />
        <div className="flex bg-background/50 rounded p-0.5 shrink-0">
          <button type="button" onClick={() => onMode("pct")} className={modeClass(mode === "pct")}>
            %
          </button>
          <button type="button" onClick={() => onMode("price")} className={modeClass(mode === "price")}>
            $
          </button>
        </div>
      </div>
      {preview && mode === "pct" && (
        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
          <span>Target: ${preview.target.toFixed(4)}</span>
          {kind === "tp" ? (
            <span className="text-trading-green">+${preview.pnl.toFixed(2)}</span>
          ) : (
            <span className="text-trading-red">{preview.pnl.toFixed(2)}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function TpSlSection(props: {
  enabled: boolean;
  onToggle: () => void;
  tpValue: string;
  slValue: string;
  tpMode: TpSlMode;
  slMode: TpSlMode;
  tp: TpSlPreview | null;
  sl: TpSlPreview | null;
  onTpValue: (value: string) => void;
  onSlValue: (value: string) => void;
  onTpMode: (mode: TpSlMode) => void;
  onSlMode: (mode: TpSlMode) => void;
}) {
  const { enabled } = props;
  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <button type="button" onClick={props.onToggle} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                enabled ? "bg-trading-purple border-trading-purple" : "border-muted-foreground"
              }`}
            >
              {enabled && <span className="text-[10px] text-foreground">✓</span>}
            </div>
            <span className="text-xs text-muted-foreground">TP/SL</span>
          </div>
          {enabled ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {enabled && (
          <div className="space-y-2 animate-fade-in">
            <TpSlField kind="tp" value={props.tpValue} mode={props.tpMode} preview={props.tp} onChange={props.onTpValue} onMode={props.onTpMode} />
            <TpSlField kind="sl" value={props.slValue} mode={props.slMode} preview={props.sl} onChange={props.onSlValue} onMode={props.onSlMode} />
          </div>
        )}
      </div>
    </div>
  );
}

export function OrderSummary({
  hasSize,
  notional,
  margin,
  fee,
  total,
}: {
  hasSize: boolean;
  notional: number;
  margin: number;
  fee: number;
  total: number;
}) {
  const value = (amount: number) => (hasSize ? `${amount.toFixed(2)} USDC` : "--");
  const valueClass = hasSize ? "text-foreground font-mono" : "text-muted-foreground";
  return (
    <div className="space-y-1 text-xs pt-2 border-t border-border/30">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Notional val.</span>
        <span className={valueClass}>{value(notional)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Margin req.</span>
        <span className={valueClass}>{value(margin)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Fee (est.)</span>
        <span className={valueClass}>{value(fee)}</span>
      </div>
      <div className="flex justify-between pt-2 border-t border-border/30">
        <span className="font-medium text-foreground">Total</span>
        <span className={hasSize ? "text-foreground font-mono font-medium" : "text-muted-foreground"}>{value(total)}</span>
      </div>
    </div>
  );
}
