"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Clock, Info, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getPositionDetail } from "../../../application";
import { formatInteger, formatPrice } from "../../format";
import { useNow } from "../../hooks/useCountdown";
import type { PositionRowView } from "../../hooks/usePositionRows";
import { useTrade } from "../../hooks/useTrade";
import { useTradeContext } from "../TradeMockProvider";

type Detail = Awaited<ReturnType<typeof getPositionDetail>>;

const signed = (value: number, digits = 2) => `${value >= 0 ? "+" : "−"}$${Math.abs(value).toFixed(digits)}`;

/** "12m 05s" until the next funding refresh, as the reference. */
const accrualLabel = (nextFundingAt: string | null, lastFundingAt: string | null, now: number) => {
  const anchor = nextFundingAt
    ? new Date(nextFundingAt).getTime()
    : lastFundingAt
      ? new Date(lastFundingAt).getTime() + 5 * 60_000
      : null;
  if (anchor === null) return "Within 5 min";
  const diff = anchor - now;
  if (diff <= 0) return "Any moment";
  return `${Math.floor(diff / 60_000)}m ${String(Math.floor((diff % 60_000) / 1000)).padStart(2, "0")}s`;
};

function DetailContent({ row }: { row: PositionRowView }) {
  const { container } = useTradeContext();
  const prices = useTrade((state) => state.prices);
  const funding = useTrade((state) => (row.position.optionId ? state.funding[row.position.optionId] : undefined));
  const [detail, setDetail] = useState<Detail | null>(null);
  const now = useNow(1000);
  const { position } = row;

  useEffect(() => {
    let active = true;
    void getPositionDetail(container.deps, { position, livePrices: prices, funding }).then((next) => {
      if (active) setDetail(next);
    });
    return () => {
      active = false;
    };
  }, [container, position, prices, funding]);

  if (!detail) return null;
  const pnlColor = detail.netPnl >= 0 ? "text-trading-green" : "text-trading-red";
  const userPays = detail.funding.userPays;
  const fundingPaid = position.fundingAccrued;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        {row.outcome ? (
          <div className="flex items-center gap-2 text-sm">
            <span className={cn("font-semibold truncate", row.outcome === "yes" ? "text-trading-green" : "text-trading-red")}>
              {row.displayOption}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">{position.leverage}x</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "px-2 py-0.5 rounded font-medium",
                position.side === "long" ? "bg-trading-green/10 text-trading-green" : "bg-trading-red/10 text-trading-red",
              )}
            >
              {position.side === "long" ? "Yes" : "No"} {position.leverage}x
            </span>
            <span className="text-muted-foreground truncate">{row.displayOption}</span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          Net unrealized PnL
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              Net PnL = Price PnL − Funding accrued. Closing now would also incur an estimated trading fee.
            </TooltipContent>
          </Tooltip>
        </div>
        <div className={cn("font-mono text-2xl font-semibold", pnlColor)}>
          {signed(detail.netPnl)}
          <span className="text-base ml-2 opacity-80">
            ({detail.pnlPercent >= 0 ? "+" : ""}
            {detail.pnlPercent.toFixed(2)}%)
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
          <span className="text-muted-foreground">Price PnL</span>
          <span className={cn("font-mono text-right", detail.pricePnl >= 0 ? "text-trading-green" : "text-trading-red")}>
            {signed(detail.pricePnl)}
          </span>
          <span className="text-muted-foreground">Funding paid</span>
          <span
            className={cn(
              "font-mono text-right",
              fundingPaid > 0 ? "text-trading-red" : fundingPaid < 0 ? "text-trading-green" : "text-foreground",
            )}
          >
            {fundingPaid >= 0 ? "−" : "+"}${Math.abs(fundingPaid).toFixed(4)}
          </span>
          <span className="text-muted-foreground">Cumulative Trading Fees</span>
          <span className="font-mono text-right text-foreground">−${detail.openFee.toFixed(4)}</span>
          <span className="text-muted-foreground">Est. close fee</span>
          <span className="font-mono text-right text-muted-foreground">≈ ${detail.estCloseFee.toFixed(4)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Position</div>
        <div className="grid grid-cols-2 gap-y-1.5 text-xs">
          <span className="text-muted-foreground">Entry price</span>
          <span className="font-mono text-right">{formatPrice(position.entryPrice)}</span>
          <span className="text-muted-foreground">Mark price</span>
          <span className="font-mono text-right">${detail.markPrice.toFixed(4)}</span>
          <span className="text-muted-foreground inline-flex items-center gap-1">
            Liq. price
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Estimated liquidation price. Ignores funding drift and maintenance-margin buffer.
              </TooltipContent>
            </Tooltip>
          </span>
          <span className="font-mono text-right text-trading-red">{row.liqPrice === null ? "--" : formatPrice(row.liqPrice)}</span>
          <span className="text-muted-foreground">Size</span>
          <span className="font-mono text-right">{formatInteger(position.size)}</span>
          <span className="text-muted-foreground">Margin</span>
          <span className="font-mono text-right">${position.margin.toFixed(2)}</span>
          <span className="text-muted-foreground">Notional</span>
          <span className="font-mono text-right">${detail.notional.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Receipt className="w-3 h-3" /> Funding
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current rate / hour</span>
            <span className={cn("font-mono inline-flex items-center gap-1", userPays ? "text-trading-red" : "text-trading-green")}>
              {userPays ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {detail.ratePerHour >= 0 ? "+" : ""}
              {(detail.ratePerHour * 100).toFixed(4)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{userPays ? "You pay / hour" : "You receive / hour"}</span>
            <span className="font-mono">≈ ${Math.abs(detail.funding.amount).toFixed(4)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> Next accrual
            </span>
            <span className="font-mono text-muted-foreground">
              {accrualLabel(detail.nextFundingAt, position.lastFundingAt, now)}
            </span>
          </div>
        </div>
        {detail.history.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none py-1">
              View funding charges ({detail.history.length})
            </summary>
            <div className="max-h-48 mt-1 rounded-md border border-border overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground bg-muted/30">
                  <tr>
                    <th className="text-left font-normal px-2 py-1">Time</th>
                    <th className="text-right font-normal px-2 py-1">Rate</th>
                    <th className="text-right font-normal px-2 py-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.history.map((entry) => (
                    <tr key={entry.id} className="border-t border-border">
                      <td className="px-2 py-1 text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        {entry.appliedRate >= 0 ? "+" : ""}
                        {(entry.appliedRate * 100).toFixed(4)}%
                      </td>
                      <td
                        className={cn(
                          "px-2 py-1 text-right font-mono",
                          entry.amount > 0 ? "text-trading-red" : entry.amount < 0 ? "text-trading-green" : "",
                        )}
                      >
                        {entry.amount >= 0 ? "−" : "+"}${Math.abs(entry.amount).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

/** Position detail: net P&L, fees, position figures and funding. */
export function PositionDetailDialog({ row, children }: { row: PositionRowView; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="pr-8 text-base leading-snug line-clamp-2">{row.position.eventName}</DialogTitle>
        </DialogHeader>
        {open && <DetailContent row={row} />}
      </DialogContent>
    </Dialog>
  );
}
