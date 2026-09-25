"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  binaryOutcome,
  directionLabel,
  isBinaryMarket,
  isReducing,
  liquidationPrice,
  type Market,
  type OrderSide,
  type OutcomeOption,
} from "../../../domain";
import { formatInteger } from "../../format";
import type { OrderFormPreview } from "../../hooks/useOrderPreview";
import { intentLabel } from "../../intentLabel";
import { TradeSubmitButton } from "../trade-form/TradeSubmitButton";

interface OrderPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  market: Market;
  option: OutcomeOption;
  side: OrderSide;
  preview: OrderFormPreview;
  marginMode: string;
  /** "Order cost" as the reference shows it: the amount as typed. */
  amountText: string;
  onConfirm: () => void;
  submitting: boolean;
}

const usdc = (value: number) => `${value.toFixed(2)} USDC`;

function FieldCard({ title, fields }: { title: string; fields: { label: string; value: string; highlight?: boolean }[] }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">{field.label}</span>
            <span className={`font-mono text-right ${field.highlight ? "text-foreground font-semibold" : "text-foreground"}`}>
              {field.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Review step before an order is sent (reference DesktopTrading.tsx:1856-1953). */
export function OrderPreviewDialog({
  open,
  onOpenChange,
  market,
  option,
  side,
  preview,
  marginMode,
  amountText,
  onConfirm,
  submitting,
}: OrderPreviewDialogProps) {
  const { quote, ticket, tp, sl } = preview;
  const { intent, cost } = quote;
  const binary = isBinaryMarket(market.options);
  // In a binary market the direction is the chosen outcome; otherwise it is the side.
  const outcome = binary ? (binaryOutcome(option.label) ?? "yes") : side === "buy" ? "yes" : "no";
  const tone = outcome === "yes" ? "green" : "red";
  const sideText = directionLabel(outcome === "yes" ? "long" : "short", binary ? market.sideLabels : undefined);
  const optionText = binary ? sideText : option.label;
  const reducing = isReducing(intent.kind);
  const tpSlText = tp || sl ? `TP ${tp ? tp.target.toFixed(4) : "--"} / SL ${sl ? sl.target.toFixed(4) : "--"}` : "--";
  const liq = liquidationPrice(quote.price, ticket.leverage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl gap-4 p-5">
        <DialogHeader>
          {/* mb-0: v4's space-y gives the title a bottom margin for the hidden description
              below; v3 put it on the description, where it had no effect (R-6 ⑦). */}
          <DialogTitle className="mb-0">Order Preview</DialogTitle>
          <DialogDescription className="sr-only">
            Review the trade, notional values, margin requirement, and position impact before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 border-b border-border/30 pb-4">
            <p className="text-sm font-medium text-foreground pr-6 line-clamp-2">{market.name}</p>
            <div className="flex items-center justify-between gap-3">
              <span
                className={`text-sm truncate font-medium ${
                  binary ? (tone === "green" ? "text-trading-green" : "text-trading-red") : "text-muted-foreground"
                }`}
              >
                {optionText}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {!binary && (
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      tone === "green" ? "bg-trading-green/15 text-trading-green" : "bg-trading-red/15 text-trading-red"
                    }`}
                  >
                    {sideText}
                  </span>
                )}
                <span className="rounded bg-muted px-2 py-1 text-xs font-semibold capitalize text-foreground">
                  {intent.kind.replace(/-/g, " ")}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldCard
              title="Trade"
              fields={[
                { label: "Type", value: ticket.orderType },
                { label: "Margin", value: marginMode },
                { label: "Leverage", value: `${ticket.leverage}X` },
                // The order's own price: the limit price for a limit order (FIX-1).
                { label: "Price", value: `${quote.price.toFixed(4)} USDC` },
              ]}
            />
            <FieldCard
              title="Notional"
              fields={[
                { label: "Order cost", value: `${amountText} USDC` },
                { label: "Traded notional", value: usdc(cost.notional) },
                { label: "Opening notional", value: usdc(intent.openingNotional) },
                { label: "Margin required", value: usdc(cost.margin), highlight: true },
              ]}
            />
          </div>

          <div className="rounded-lg border border-border/50 bg-background p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Position impact</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {reducing
                    ? "This order reduces the existing position and releases margin."
                    : "This order increases exposure and requires opening margin."}
                </p>
              </div>
              <div className="grid min-w-[280px] grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {reducing ? (
                  <>
                    <span className="text-muted-foreground">Released margin</span>
                    <span className="text-right font-mono text-trading-green">+{intent.releasedMargin.toFixed(2)} USDC</span>
                    <span className="text-muted-foreground">Realized PnL est.</span>
                    <span className={`text-right font-mono ${intent.realizedPnl >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                      {intent.realizedPnl >= 0 ? "+" : "-"}
                      {Math.abs(intent.realizedPnl).toFixed(2)} USDC
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">Margin required</span>
                    <span className="text-right font-mono text-foreground">{usdc(cost.margin)}</span>
                    <span className="text-muted-foreground">Liq. price</span>
                    <span className="text-right font-mono text-foreground">{liq === null ? "--" : liq.toFixed(4)} USDC</span>
                  </>
                )}
                <span className="text-muted-foreground">TP/SL</span>
                <span className="text-right font-mono text-foreground">{tpSlText}</span>
              </div>
            </div>
          </div>
        </div>

        <TradeSubmitButton
          side={side}
          label={intentLabel(intent, side, option.label, binary ? market.sideLabels : undefined)}
          potentialWin={preview.hasSize ? formatInteger(quote.preview.potentialWin) : "0"}
          onClick={onConfirm}
          loading={submitting}
          size="lg"
          className="mt-4"
        />
      </DialogContent>
    </Dialog>
  );
}
