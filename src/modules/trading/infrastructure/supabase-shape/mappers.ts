import {
  parseSideLabels,
  type Market,
  type OrderSide,
  type PendingOrderSnapshot,
  type PositionSnapshot,
  type Side,
} from "../../domain";
import type { EventWithOptions, PositionRow, TradeRow } from "./rows";

export const toMarket = (event: EventWithOptions): Market => ({
  id: event.id,
  name: event.name,
  endTime: event.end_date ? new Date(event.end_date) : null,
  options: event.options.map((option) => ({ id: option.id, label: option.label, price: Number(option.price) })),
  sideLabels: parseSideLabels(event.side_labels),
});

export const toPositionSnapshot = (row: PositionRow): PositionSnapshot => ({
  id: row.id,
  eventName: row.event_name,
  optionLabel: row.option_label,
  side: row.side as Side,
  size: Number(row.size),
  entryPrice: Number(row.entry_price),
  margin: Number(row.margin),
  fundingAccrued: Number(row.funding_accrued),
  createdAt: row.created_at,
});

export const toPendingOrderSnapshot = (row: TradeRow): PendingOrderSnapshot => ({
  eventName: row.event_name,
  optionLabel: row.option_label,
  side: row.side as OrderSide,
  quantity: Number(row.quantity),
  status: row.status,
});
