"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TpSlSetting } from "../../../application";
import { directionLabel, estimateTpSlEditPnl, type TpSlKind } from "../../../domain";
import { formatPrice } from "../../format";
import type { PositionRowView } from "../../hooks/usePositionRows";

type Mode = "%" | "$";

// The reference drops the minus here (E-35).
const signedUsd = (value: number) => `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;

interface EditTpSlDialogProps {
  row: PositionRowView | null;
  onOpenChange: (open: boolean) => void;
  onSave: (tp: TpSlSetting | null, sl: TpSlSetting | null) => Promise<unknown>;
}

function TargetField({
  kind,
  value,
  mode,
  estimate,
  onValue,
  onMode,
}: {
  kind: TpSlKind;
  value: string;
  mode: Mode;
  estimate: number | null;
  onValue: (value: string) => void;
  onMode: (mode: Mode) => void;
}) {
  const modeClass = (active: boolean) =>
    `px-2 py-1.5 text-xs rounded-md transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={`text-xs ${kind === "tp" ? "text-trading-green" : "text-trading-red"} font-medium`}>
          {kind === "tp" ? "Take Profit" : "Stop Loss"}
        </label>
        {estimate !== null && (
          <span className={`text-xs font-mono ${estimate >= 0 ? "text-trading-green" : "text-trading-red"}`}>
            Est. P&L: {signedUsd(estimate)}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="number"
            value={value}
            onChange={(event) => onValue(event.target.value)}
            placeholder="0"
            className="w-full bg-muted border-0 rounded-lg px-3 py-2 text-sm font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex bg-muted rounded-lg p-0.5 shrink-0">
          <button type="button" onClick={() => onMode("%")} className={modeClass(mode === "%")}>
            %
          </button>
          <button type="button" onClick={() => onMode("$")} className={modeClass(mode === "$")}>
            $
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTpSlForm({ row, onClose, onSave }: { row: PositionRowView; onClose: () => void; onSave: EditTpSlDialogProps["onSave"] }) {
  const { position } = row;
  const [tpValue, setTpValue] = useState(position.tp ? String(position.tp.value) : "");
  const [slValue, setSlValue] = useState(position.sl ? String(position.sl.value) : "");
  const [tpMode, setTpMode] = useState<Mode>(position.tp?.mode ?? "%");
  const [slMode, setSlMode] = useState<Mode>(position.sl?.mode ?? "%");
  const estimate = (kind: TpSlKind, value: string, mode: Mode) =>
    estimateTpSlEditPnl({ position, kind, mode: mode === "%" ? "pct" : "price", value: Number.parseFloat(value) || 0 });
  const toSetting = (value: string, mode: Mode): TpSlSetting | null => {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) && number > 0 ? { value: number, mode } : null;
  };

  const outcomeColor = row.outcome
    ? row.outcome === "yes"
      ? "text-trading-green"
      : "text-trading-red"
    : position.side === "long"
      ? "text-trading-green"
      : "text-trading-red";
  const sideLabel = row.outcome ? directionLabel(row.outcome === "yes" ? "long" : "short", row.sideLabels) : position.optionLabel;

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Position</span>
          <span className={outcomeColor}>
            {sideLabel} {position.leverage}x
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Contract</span>
          <span className="font-medium">{row.displayOption}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Entry Price</span>
          <span className="font-mono">{formatPrice(position.entryPrice)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Mark Price</span>
          <span className="font-mono">{formatPrice(row.markPrice)}</span>
        </div>
      </div>

      <TargetField kind="tp" value={tpValue} mode={tpMode} estimate={estimate("tp", tpValue, tpMode)} onValue={setTpValue} onMode={setTpMode} />
      <TargetField kind="sl" value={slValue} mode={slMode} estimate={estimate("sl", slValue, slMode)} onValue={setSlValue} onMode={setSlMode} />

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={async () => {
            if ((await onSave(toSetting(tpValue, tpMode), toSetting(slValue, slMode))) !== undefined) onClose();
          }}
          className="flex-1 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

/** Edit an open position's take-profit / stop-loss. */
export function EditTpSlDialog({ row, onOpenChange, onSave }: EditTpSlDialogProps) {
  return (
    <Dialog open={row !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base">Edit TP/SL</DialogTitle>
        </DialogHeader>
        {row && <EditTpSlForm key={row.position.id} row={row} onClose={() => onOpenChange(false)} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}
