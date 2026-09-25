"use client";

import { useState, type ReactNode } from "react";
import { roe as roeOf, type HistoryRow, type OrderRow, type PositionRow } from "../../../domain";
import { cn } from "../../cn";
import { LeagueBadge } from "../league/LeagueBadge";
import { AirdropBadge, OutcomeTag, TpSlCell } from "./cells";
import { CancelOrderDialog, ClosePositionDialog, EditTpslDialog } from "./PositionDialogs";

type Tab = "positions" | "orders" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "positions", label: "Positions" },
  { id: "orders", label: "Open Orders" },
  { id: "history", label: "History" },
];

/**
 * Positions, open orders and history with their close, cancel and TP/SL dialogs
 * (dev reference §5.9, reference PositionsTable.tsx). Rows are addressed by index (BUG-7).
 */
export function PositionsTable({
  positions,
  orders,
  history,
  onClosePosition,
  onCancelOrder,
  onUpdateTpsl,
  className,
}: {
  positions: PositionRow[];
  orders: OrderRow[];
  history: HistoryRow[];
  onClosePosition: (index: number) => void;
  onCancelOrder: (index: number) => void;
  onUpdateTpsl: (index: number, next: { tp: number | null; sl: number | null }) => void;
  className?: string;
}) {
  const [tab, setTab] = useState<Tab>("positions");
  const counts: Record<Tab, number> = { positions: positions.length, orders: orders.length, history: history.length };
  return (
    <div className={cn("rounded-2xl border border-border bg-surface shadow-card", className)}>
      <div className="flex items-center gap-1 border-b border-border px-4 pt-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative px-3 py-2 text-xs font-display font-semibold uppercase tracking-widest transition-colors",
              tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id && <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-gradient-neon" />}
            <span className="ml-1.5 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">{counts[t.id]}</span>
          </button>
        ))}
      </div>
      {tab === "positions" && <PositionTable rows={positions} onClose={onClosePosition} onUpdateTpsl={onUpdateTpsl} />}
      {tab === "orders" && <OrderTable rows={orders} onCancel={onCancelOrder} />}
      {tab === "history" && <HistoryTable rows={history} />}
    </div>
  );
}

function PositionTable({
  rows,
  onClose,
  onUpdateTpsl,
}: {
  rows: PositionRow[];
  onClose: (index: number) => void;
  onUpdateTpsl: (index: number, next: { tp: number | null; sl: number | null }) => void;
}) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const editRow = editIdx !== null ? rows[editIdx] : null;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <Th>Event</Th>
              <Th>Market</Th>
              <Th className="text-right">Size</Th>
              <Th className="text-right">Entry</Th>
              <Th className="text-right">Mark</Th>
              <Th className="text-right">Lev</Th>
              <Th className="text-right">Margin</Th>
              <Th className="text-right">Liq</Th>
              <Th className="text-right">TP / SL</Th>
              <Th className="text-right">PnL</Th>
              <Th className="text-right">ROE</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => {
              const roe = roeOf(r.pnl, r.margin);
              return (
                <tr key={i} className="hover:bg-white/[0.02]">
                  <Td>
                    <div className="flex items-center gap-2">
                      <LeagueBadge league={r.league} showLabel={false} />
                      {r.isAirdrop && <AirdropBadge />}
                      <span className="font-medium text-foreground">{r.market}</span>
                    </div>
                  </Td>
                  <Td>
                    <OutcomeTag outcome={r.outcome} label={r.outcomeLabel} eventShape={r.eventShape} />
                  </Td>
                  <Td className="text-right font-mono tabular-nums">{r.size}</Td>
                  <Td className="text-right font-mono tabular-nums">{r.entry}¢</Td>
                  <Td className="text-right font-mono tabular-nums">{r.mark}¢</Td>
                  <Td className="text-right font-mono tabular-nums">{r.leverage}×</Td>
                  <Td className="text-right font-mono tabular-nums">{r.margin.toFixed(0)}</Td>
                  <Td className="text-right font-mono tabular-nums text-loss">{r.liq}¢</Td>
                  <Td className="text-right">
                    <TpSlCell tp={r.tp ?? null} sl={r.sl ?? null} locked={r.isAirdrop} onClick={() => setEditIdx(i)} />
                  </Td>
                  <Td className={cn("text-right font-mono tabular-nums", r.pnl >= 0 ? "text-win" : "text-loss")}>
                    {r.pnl >= 0 ? "+" : ""}
                    {r.pnl.toFixed(2)}
                  </Td>
                  <Td className={cn("text-right font-mono tabular-nums", roe >= 0 ? "text-win" : "text-loss")}>
                    {roe >= 0 ? "+" : ""}
                    {roe.toFixed(1)}%
                  </Td>
                  <Td className="text-right">
                    <ClosePositionDialog row={r} roe={roe} onConfirm={() => onClose(i)} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editRow && editIdx !== null && (
        <EditTpslDialog
          row={editRow}
          open
          onOpenChange={(open) => {
            if (!open) setEditIdx(null);
          }}
          onSave={(next) => {
            onUpdateTpsl(editIdx, next);
            setEditIdx(null);
          }}
        />
      )}
    </>
  );
}

function OrderTable({ rows, onCancel }: { rows: OrderRow[]; onCancel: (index: number) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Th>Event</Th>
            <Th>Market</Th>
            <Th>Type</Th>
            <Th className="text-right">Price</Th>
            <Th className="text-right">Size</Th>
            <Th className="text-right">Filled</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-white/[0.02]">
              <Td>
                <div className="flex items-center gap-2">
                  <LeagueBadge league={r.league} showLabel={false} />
                  <span className="font-medium text-foreground">{r.market}</span>
                </div>
              </Td>
              <Td>
                <OutcomeTag outcome={r.outcome} label={r.outcomeLabel} eventShape={r.eventShape} />
              </Td>
              <Td className="font-mono uppercase text-[10px] tracking-widest text-muted-foreground">{r.type}</Td>
              <Td className="text-right font-mono tabular-nums">{r.price}¢</Td>
              <Td className="text-right font-mono tabular-nums">{r.size}</Td>
              <Td className="text-right font-mono tabular-nums">{r.filled}%</Td>
              <Td className="text-right">
                <CancelOrderDialog row={r} onConfirm={() => onCancel(i)} />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) {
    return <div className="p-12 text-center font-mono text-xs text-muted-foreground">No historical trades yet.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Th>Event</Th>
            <Th>Market</Th>
            <Th>Action</Th>
            <Th className="text-right">Price</Th>
            <Th className="text-right">Size</Th>
            <Th className="text-right">PnL</Th>
            <Th className="text-right">When</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-white/[0.02]">
              <Td>
                <div className="flex items-center gap-2">
                  <LeagueBadge league={r.league} showLabel={false} />
                  <span className="font-medium text-foreground">{r.market}</span>
                </div>
              </Td>
              <Td>
                <OutcomeTag outcome={r.outcome} label={r.outcomeLabel} eventShape={r.eventShape} />
              </Td>
              <Td className="font-mono uppercase text-[10px] tracking-widest text-muted-foreground">{r.action}</Td>
              <Td className="text-right font-mono tabular-nums">{r.price}¢</Td>
              <Td className="text-right font-mono tabular-nums">{r.size}</Td>
              <Td
                className={cn(
                  "text-right font-mono tabular-nums",
                  r.pnl === undefined ? "text-muted-foreground" : r.pnl >= 0 ? "text-win" : "text-loss",
                )}
              >
                {r.pnl === undefined ? "—" : `${r.pnl >= 0 ? "+" : ""}${r.pnl.toFixed(2)}`}
              </Td>
              <Td className="text-right font-mono tabular-nums text-muted-foreground">{r.when}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("px-4 py-2 font-normal", className)}>{children}</th>;
}

function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3", className)}>{children}</td>;
}
