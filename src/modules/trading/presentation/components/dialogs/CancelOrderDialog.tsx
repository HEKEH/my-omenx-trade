"use client";

import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { directionLabel, toSide } from "../../../domain";
import { formatInteger, formatPrice } from "../../format";
import type { OrderRowView } from "../../hooks/usePositionRows";

// Tailwind 3 default palette values (Tailwind 4 redefined them in oklch; R-6 ⑧).
const STATUS_CLASS: Record<string, string> = {
  Pending: "bg-[#f59e0b]/20 text-[#fbbf24]",
  "Partial Filled": "bg-[#06b6d4]/20 text-[#22d3ee]",
};

interface CancelOrderDialogProps {
  row: OrderRowView | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/** Confirmation before cancelling a pending order. */
export function CancelOrderDialog({ row, onOpenChange, onConfirm }: CancelOrderDialogProps) {
  const order = row?.order;
  const outcome = row?.outcome ?? null;
  const tone = outcome ? (outcome === "yes" ? "green" : "red") : order?.side === "buy" ? "green" : "red";
  const typeLabel = order
    ? outcome
      ? `${row!.displayOption} ${order.orderType}`
      : `${directionLabel(toSide(order.side), row!.sideLabels)} ${order.orderType}`
    : "";

  return (
    <AlertDialog open={row !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-trading-red" />
            Cancel Order
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">Are you sure you want to cancel this order?</AlertDialogDescription>
        </AlertDialogHeader>
        {order && row && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 my-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Order Type</span>
              <span className={`${tone === "green" ? "text-trading-green" : "text-trading-red"} font-medium`}>{typeLabel}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Contract</span>
              <span
                className={`font-medium ${outcome === "yes" ? "text-trading-green" : outcome === "no" ? "text-trading-red" : ""}`}
              >
                {row.displayOption}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Event</span>
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{order.eventName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Price</span>
              <span className="font-mono">{formatPrice(order.price)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-mono">{formatInteger(order.quantity)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-mono">${order.amount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-border/30 pt-2 mt-2">
              <span className="text-muted-foreground">Status</span>
              <span className={`px-2 py-0.5 rounded text-xs ${STATUS_CLASS[order.status] ?? "bg-muted text-muted-foreground"}`}>
                {order.status}
              </span>
            </div>
          </div>
        )}
        <AlertDialogFooter className="flex gap-2 sm:gap-2">
          <AlertDialogCancel className="flex-1">Keep Order</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="flex-1 bg-trading-red hover:bg-trading-red/90 text-white">
            Cancel Order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
