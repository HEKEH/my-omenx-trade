"use client";

import { useState } from "react";
import { FEE_RATE, parseTpSlInput, previewTpSlPnl, validateTpSl, type OrderRow, type PositionRow } from "../../../domain";
import { cn } from "../../cn";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Kv, OutcomeTag } from "./cells";

/** Close confirmation at the current mark (reference PositionsTable.tsx:532-602). */
export function ClosePositionDialog({ row, roe, onConfirm }: { row: PositionRow; roe: number; onConfirm: () => void }) {
  const isWin = row.pnl >= 0;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="rounded-md border border-border bg-white/[0.04] px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
        >
          Close
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close position?</AlertDialogTitle>
          <AlertDialogDescription>
            This closes your position at the current mark. The trade will be settled instantly and moved to History.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-xl border border-border bg-white/[0.02] p-3 font-mono text-[11px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-foreground">{row.market}</span>
            <OutcomeTag outcome={row.outcome} label={row.outcomeLabel} eventShape={row.eventShape} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[10px]">
            <Kv k="Size" v={`${row.size}`} />
            <Kv k="Lev" v={`${row.leverage}×`} />
            <Kv k="Entry" v={`${row.entry}¢`} />
            <Kv k="Mark" v={`${row.mark}¢`} />
            <Kv k="PnL" v={`${isWin ? "+" : ""}${row.pnl.toFixed(2)} USDC`} tone={isWin ? "win" : "loss"} />
            <Kv k="ROE" v={`${roe >= 0 ? "+" : ""}${roe.toFixed(1)}%`} tone={roe >= 0 ? "win" : "loss"} />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep open</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(isWin ? "bg-win text-background hover:bg-win/90" : "bg-loss text-background hover:bg-loss/90")}
          >
            Close at {row.mark}¢
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Cancel confirmation; partly filled orders keep their filled part (PositionsTable.tsx:604-659). */
export function CancelOrderDialog({ row, onConfirm }: { row: OrderRow; onConfirm: () => void }) {
  const partial = row.filled > 0 && row.filled < 100;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="rounded-md border border-loss/30 bg-loss/10 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-loss transition hover:bg-loss/20"
        >
          Cancel
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
          <AlertDialogDescription>
            {partial
              ? `${row.filled}% has already been filled. Cancelling only removes the unfilled portion — the filled part stays as a position.`
              : "The order will be removed from the book."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-xl border border-border bg-white/[0.02] p-3 font-mono text-[11px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-foreground">{row.market}</span>
            <OutcomeTag outcome={row.outcome} label={row.outcomeLabel} eventShape={row.eventShape} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[10px]">
            <Kv k="Type" v={row.type.toUpperCase()} />
            <Kv k="Price" v={`${row.price}¢`} />
            <Kv k="Size" v={`${row.size}`} />
            <Kv k="Filled" v={`${row.filled}%`} />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep order</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-loss text-background hover:bg-loss/90">
            Cancel order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Edit or remove a position's TP / SL, validated against its entry and liquidation price (PositionsTable.tsx:661-843). */
export function EditTpslDialog({
  row,
  open,
  onOpenChange,
  onSave,
}: {
  row: PositionRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (next: { tp: number | null; sl: number | null }) => void;
}) {
  const [tp, setTp] = useState(row.tp != null ? String(row.tp) : "");
  const [sl, setSl] = useState(row.sl != null ? String(row.sl) : "");
  const tpNum = parseTpSlInput(tp);
  const slNum = parseTpSlInput(sl);
  const notional = row.margin * row.leverage;
  const input = { side: row.outcome, entry: row.entry, liq: row.liq, leverage: row.leverage, tp: tpNum, sl: slNum };
  const validation = validateTpSl(input);
  const preview = previewTpSlPnl({ ...input, notional, fee: notional * FEE_RATE });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust TP / SL</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px] uppercase tracking-widest">
            <OutcomeTag outcome={row.outcome} label={row.outcomeLabel} eventShape={row.eventShape} />
            <span>entry {row.entry}¢</span>
            <span className="opacity-50">·</span>
            <span>mark {row.mark}¢</span>
            {row.leverage > 1 && (
              <>
                <span className="opacity-50">·</span>
                <span className="text-loss">liq {row.liq}¢</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <TpSlField label="TP (¢)" value={tp} onChange={setTp} error={validation.tpError} tone="win" />
            <TpSlField label="SL (¢)" value={sl} onChange={setSl} error={validation.slError} tone="loss" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <PreviewBox label="If TP hits" pnl={preview.tpPnl} />
            <PreviewBox label="If SL hits" pnl={preview.slPnl} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => onSave({ tp: null, sl: null })}
            disabled={row.tp == null && row.sl == null}
            className="mr-auto rounded-md border border-border bg-white/[0.04] px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground transition hover:text-foreground disabled:opacity-40"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-border bg-transparent px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ tp: tpNum, sl: slNum })}
            disabled={validation.hasError}
            className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TpSlField({
  label,
  value,
  onChange,
  error,
  tone,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  tone: "win" | "loss";
}) {
  return (
    <div className="space-y-1">
      <label className={cn("flex items-center justify-between rounded-xl border bg-white/[0.02] px-3 py-2", error ? "border-loss/60" : "border-border")}>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          inputMode="decimal"
          className={cn(
            "w-20 bg-transparent text-right font-mono text-sm tabular-nums outline-none placeholder:text-muted-foreground",
            error ? "text-loss" : tone === "win" ? "text-win" : "text-loss",
          )}
        />
      </label>
      {error && <p className="px-1 text-[10px] font-mono text-loss">{error}</p>}
    </div>
  );
}

function PreviewBox({ label, pnl }: { label: string; pnl: number | null }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
      <div className="text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className={cn("mt-0.5 tabular-nums", pnl !== null ? (pnl >= 0 ? "text-win" : "text-loss") : "text-muted-foreground/50")}>
        {pnl !== null ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USDC` : "—"}
      </div>
    </div>
  );
}
