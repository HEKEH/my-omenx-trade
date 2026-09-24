"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { clampCloseQuantity, computeClose, maxCloseQuantity, quickCloseQuantity, returnOnMargin } from "../../../domain";
import { formatInteger } from "../../format";
import type { PositionRowView } from "../../hooks/usePositionRows";

const QUICK_RATIOS = [25, 50, 75, 100] as const;

const usd = (value: number) => `${value >= 0 ? "" : "-"}$${Math.abs(value).toFixed(2)}`;
const pct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

interface ClosePositionDialogProps {
  row: PositionRowView;
  busy: boolean;
  onConfirm: (quantity: number) => Promise<unknown>;
  children: ReactNode;
}

/**
 * Close part or all of a position at the live mark. The estimate uses the
 * same domain rule as the close itself, so it includes the funding share.
 */
export function ClosePositionDialog({ row, busy, onConfirm, children }: ClosePositionDialogProps) {
  const [open, setOpen] = useState(false);
  const { position, markPrice } = row;
  // At least 1 so the slider range stays valid.
  const max = Math.max(1, maxCloseQuantity(position.size));
  const [quantity, setQuantity] = useState(max);
  const qty = clampCloseQuantity(quantity, position.size);
  const estimate = computeClose({ position, quantity: qty, closePrice: markPrice });
  const ratio = Math.round((qty / max) * 100);
  const full = qty === max;

  const confirm = async () => {
    if ((await onConfirm(qty)) !== undefined) setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuantity(max);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Close position</DialogTitle>
          <DialogDescription className="text-xs">
            {`${row.displayOption} ${position.leverage}x · ${max.toLocaleString("en-US")} contracts`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_RATIOS.map((ratioOption) => {
              const optionQty = ratioOption === 100 ? max : quickCloseQuantity(max, ratioOption);
              const active = optionQty === qty;
              return (
                <button
                  key={ratioOption}
                  type="button"
                  onClick={() => setQuantity(optionQty)}
                  className={`h-9 text-xs font-medium rounded-md transition-colors ${
                    active
                      ? "bg-trading-red/20 text-trading-red border border-trading-red/40"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
                  }`}
                >
                  {ratioOption}%
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Slider min={1} max={max} step={1} value={[qty]} onValueChange={([next]) => setQuantity(next)} />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-mono text-foreground">
                {formatInteger(qty)} <span className="text-muted-foreground">({ratio}%)</span>
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Close price (mark)</span>
              <span className="font-mono text-foreground">${markPrice.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Realized PnL</span>
              <span className={`font-mono ${estimate.realizedPnl >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                {estimate.realizedPnl >= 0 ? "+" : ""}
                {usd(estimate.realizedPnl)}{" "}
                <span className="opacity-70">({pct(returnOnMargin(estimate.realizedPnl, position.margin))})</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Released margin</span>
              <span className="font-mono text-foreground">${estimate.releasedMargin.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Remaining size</span>
              <span className="font-mono text-foreground">{formatInteger(estimate.remaining.size)} contracts</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirm}
                disabled={busy || qty < 1}
                className="flex-1 h-11 bg-trading-red text-white hover:bg-trading-red/90 disabled:opacity-60"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                {full ? "Close all" : `Close ${formatInteger(qty)} contracts`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
