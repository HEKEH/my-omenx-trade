"use client";

import { useState } from "react";
import { ExternalLink, Pencil } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { directionLabel, toSide } from "../../../domain";
import { TERMS } from "../../copy";
import { formatInteger, formatPrice, formatSignedPercent, formatTimeAgo } from "../../format";
import { usePositionActions } from "../../hooks/usePositionActions";
import { useOrderRows, usePositionRows, type OrderRowView, type PositionRowView } from "../../hooks/usePositionRows";
import { useNow } from "../../hooks/useCountdown";
import { CancelOrderDialog } from "../dialogs/CancelOrderDialog";
import { ClosePositionDialog } from "../dialogs/ClosePositionDialog";
import { EditTpSlDialog } from "../dialogs/EditTpSlDialog";
import { PositionDetailDialog } from "../dialogs/PositionDetailDialog";

type Tab = "Positions" | "Orders";

const th = (align: "left" | "right" | "center") => `px-4 py-2 text-xs text-muted-foreground font-normal text-${align}`;

const outcomeText = (outcome: "yes" | "no" | null) =>
  outcome === "yes" ? "text-trading-green" : outcome === "no" ? "text-trading-red" : "text-foreground";

/** "+$1.23" / "-$1.23" (the reference dropped the minus on losses; E-35). */
const signedUsd = (value: number) => `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;

const tpSlText = (value: number, mode: "%" | "$", profit: boolean) =>
  mode === "%" ? `${profit ? "+" : "-"}${value}%` : `$${value}`;

function EventHoverCard({ eventName, onGo }: { eventName: string; onGo: () => void }) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="text-xs text-muted-foreground truncate max-w-[180px] cursor-help border-b border-dashed border-transparent hover:border-muted-foreground inline-block">
          {eventName}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 p-3" side="bottom" align="start">
        <p className="text-sm font-medium mb-2">{eventName}</p>
        <button type="button" onClick={onGo} className="text-sm text-primary flex items-center gap-1.5 hover:underline">
          <ExternalLink className="w-3.5 h-3.5" />
          Go to this event
        </button>
      </HoverCardContent>
    </HoverCard>
  );
}

function SideBadge({
  side,
  outcome,
  label,
  dashClass = "text-xs",
}: {
  side: "long" | "short";
  outcome: "yes" | "no" | null;
  label: string;
  /** The reference's orders table leaves the dash at the cell's 16px; positions use text-xs. */
  dashClass?: string;
}) {
  if (outcome) return <span className={`${dashClass} text-muted-foreground/40`.trim()}>—</span>;
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        side === "long" ? "bg-trading-green/20 text-trading-green" : "bg-trading-red/20 text-trading-red"
      }`}
    >
      {label}
    </span>
  );
}

function OrdersTable({ rows, onGo, onCancel }: { rows: OrderRowView[]; onGo: (eventId: string) => void; onCancel: (row: OrderRowView) => void }) {
  const now = useNow(30_000);
  return (
    <table className="w-full">
      <thead className="sticky top-0 z-10 bg-background">
        <tr className="border-b border-border/30">
          <th className={th("left")}>{TERMS.CONTRACTS}</th>
          <th className={th("left")}>{TERMS.SIDE}</th>
          <th className={th("left")}>{TERMS.ORDER_TYPE}</th>
          <th className={th("right")}>{TERMS.PRICE}</th>
          <th className={th("right")}>{TERMS.QTY}</th>
          <th className={th("right")}>{TERMS.VALUE}</th>
          <th className={th("left")}>{TERMS.STATUS}</th>
          <th className={th("left")}>{TERMS.TIME}</th>
          <th className={th("center")}>{TERMS.ACTION}</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={9} className="px-4 py-6 text-center text-sm text-muted-foreground">
              No open orders
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const { order } = row;
            return (
              <tr key={order.id} className="border-b border-border/30 hover:bg-muted/20">
                <td className="px-4 py-2">
                  <div className={`text-sm font-medium ${outcomeText(row.outcome)}`}>{row.displayOption}</div>
                  <EventHoverCard eventName={order.eventName} onGo={() => row.listing && onGo(row.listing.market.id)} />
                </td>
                <td className="px-4 py-2">
                  <SideBadge side={toSide(order.side)} outcome={row.outcome} label={directionLabel(toSide(order.side), row.sideLabels)} dashClass="" />
                </td>
                <td className="px-4 py-2 text-sm">{order.orderType}</td>
                <td className="px-4 py-2 text-sm font-mono text-right">{formatPrice(order.price)}</td>
                <td className="px-4 py-2 text-sm font-mono text-right">{formatInteger(order.quantity)}</td>
                <td className="px-4 py-2 text-sm font-mono text-right">${order.amount.toFixed(2)}</td>
                <td className="px-4 py-2">
                  {order.status === "Partial Filled" ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="px-2 py-0.5 rounded text-xs bg-trading-yellow/20 text-trading-yellow cursor-help">{order.status}</span>
                      </TooltipTrigger>
                      <TooltipContent className="p-2">
                        {/* Fills are whole-order only (A-8), so no filled amount is known. */}
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Filled:</span>
                            <span className="font-mono text-trading-green">0</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Remaining:</span>
                            <span className="font-mono text-trading-yellow">{formatInteger(order.quantity)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded overflow-hidden mt-1">
                            <div className="h-full bg-trading-green" style={{ width: "0%" }} />
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{order.status}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{formatTimeAgo(order.createdAt, new Date(now))}</td>
                <td className="px-4 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => onCancel(row)}
                    className="px-3 py-1 text-xs text-trading-red border border-trading-red/50 rounded hover:bg-trading-red/10"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function PositionsTable({
  rows,
  busy,
  onGo,
  onEditTpSl,
  onClose,
}: {
  rows: PositionRowView[];
  busy: boolean;
  onGo: (eventId: string) => void;
  onEditTpSl: (row: PositionRowView) => void;
  onClose: (positionId: string, quantity: number) => Promise<unknown>;
}) {
  return (
    <table className="w-full">
      <thead className="sticky top-0 z-10 bg-background">
        <tr className="border-b border-border/30">
          <th className={th("left")}>{TERMS.CONTRACTS}</th>
          <th className={th("left")}>{TERMS.SIDE}</th>
          <th className={th("right")}>{TERMS.QTY}</th>
          <th className={th("right")}>{TERMS.ENTRY_PRICE}</th>
          <th className={th("right")}>{TERMS.MARK_PRICE}</th>
          <th className={th("right")}>{TERMS.LIQ_PRICE}</th>
          <th className={th("right")}>{TERMS.MARGIN}</th>
          <th className={th("right")}>{TERMS.UNREALIZED_PNL}</th>
          <th className={th("left")}>{TERMS.LEVERAGE}</th>
          <th className={th("center")}>{TERMS.TPSL}</th>
          <th className={th("center")}>{TERMS.ACTION}</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={11} className="px-4 py-6 text-center text-sm text-muted-foreground">
              No open positions
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const { position } = row;
            const profitable = row.pnl >= 0;
            const contractColor =
              row.outcome === "yes"
                ? "text-trading-green hover:text-trading-green/80 border-trading-green/40 hover:border-trading-green"
                : row.outcome === "no"
                  ? "text-trading-red hover:text-trading-red/80 border-trading-red/40 hover:border-trading-red"
                  : "hover:text-primary border-muted-foreground hover:border-foreground";
            return (
              <tr key={position.id} className="border-b border-border/30 hover:bg-muted/20 transition-all duration-500">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <PositionDetailDialog row={row}>
                      <button
                        type="button"
                        className={`text-sm font-medium truncate border-b border-dashed transition-colors text-left cursor-pointer ${contractColor}`}
                        title="View position details"
                      >
                        {row.displayOption}
                      </button>
                    </PositionDetailDialog>
                  </div>
                  <EventHoverCard eventName={position.eventName} onGo={() => row.listing && onGo(row.listing.market.id)} />
                </td>
                <td className="px-4 py-2">
                  <SideBadge side={position.side} outcome={row.outcome} label={directionLabel(position.side, row.sideLabels)} />
                </td>
                <td className="px-4 py-2 text-sm font-mono text-right">{formatInteger(position.size)}</td>
                <td className="px-4 py-2 text-sm font-mono text-right">{formatPrice(position.entryPrice)}</td>
                <td className="px-4 py-2 text-sm font-mono text-right">{formatPrice(row.markPrice)}</td>
                <td className="px-4 py-2 text-sm font-mono text-right" title="Estimated, ignores funding and MM buffer">
                  {row.liqPrice === null ? "--" : formatPrice(row.liqPrice)}
                </td>
                <td className="px-4 py-2 text-sm font-mono text-right">${position.margin.toFixed(2)}</td>
                <td className="px-4 py-2 text-right">
                  <span className={`text-sm font-mono ${profitable ? "text-trading-green" : "text-trading-red"}`}>{signedUsd(row.pnl)}</span>
                  <span className={`text-xs ml-1 ${profitable ? "text-trading-green" : "text-trading-red"}`}>
                    ({formatSignedPercent(row.roe)})
                  </span>
                </td>
                <td className="px-4 py-2 text-sm">{position.leverage}x</td>
                <td className="px-4 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => onEditTpSl(row)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors group mx-auto"
                  >
                    {position.tp || position.sl ? (
                      <span className="text-xs">
                        {position.tp && <span className="text-trading-green">{tpSlText(position.tp.value, position.tp.mode, true)}</span>}
                        {position.tp && position.sl && " / "}
                        {position.sl && <span className="text-trading-red">{tpSlText(position.sl.value, position.sl.mode, false)}</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Add</span>
                    )}
                    <Pencil className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                  </button>
                </td>
                <td className="px-4 py-2 text-center">
                  <ClosePositionDialog row={row} busy={busy} onConfirm={(quantity) => onClose(position.id, quantity)}>
                    <button type="button" className="px-3 py-1 text-xs text-foreground border border-border/50 rounded hover:bg-muted">
                      {TERMS.CLOSE}
                    </button>
                  </ClosePositionDialog>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

/** Bottom panel: positions and current orders (reference DesktopTrading.tsx:1052-1458). */
export function PositionsPanel({ onGoToEvent }: { onGoToEvent: (eventId: string) => void }) {
  // The reference opens on Current Orders (E-23).
  const [tab, setTab] = useState<Tab>("Orders");
  const positionRows = usePositionRows();
  const orderRows = useOrderRows();
  const actions = usePositionActions();
  const [cancelling, setCancelling] = useState<OrderRowView | null>(null);
  const [editing, setEditing] = useState<PositionRowView | null>(null);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "Positions", label: "Positions", count: positionRows.length },
    { key: "Orders", label: "Current Orders", count: orderRows.length },
  ];

  return (
    <>
      <div className="flex items-center gap-1 px-4 border-b border-border/30 relative z-20">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              tab === key ? "text-trading-purple border-b-2 border-trading-purple" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            <span className="ml-1 text-muted-foreground">({count})</span>
          </button>
        ))}
      </div>

      <div className="max-h-[460px] overflow-y-auto overscroll-contain">
        {tab === "Orders" ? (
          <OrdersTable rows={orderRows} onGo={onGoToEvent} onCancel={setCancelling} />
        ) : (
          <PositionsTable rows={positionRows} busy={actions.busy} onGo={onGoToEvent} onEditTpSl={setEditing} onClose={actions.close} />
        )}
      </div>

      <CancelOrderDialog
        row={cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        onConfirm={() => {
          if (!cancelling) return;
          const { order, displayOption } = cancelling;
          void actions.cancel(order.id, `Your ${order.side} order for ${displayOption} has been cancelled.`);
          setCancelling(null);
        }}
      />
      <EditTpSlDialog
        row={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSave={(tp, sl) => (editing ? actions.updateTpSl(editing.position.id, tp, sl) : Promise.resolve(undefined))}
      />
    </>
  );
}
