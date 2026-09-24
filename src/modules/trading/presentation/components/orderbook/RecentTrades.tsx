"use client";

import { formatInteger } from "../../format";
import type { TradeRow } from "../../hooks/useOrderBook";

/** Latest trades, newest first; the newest one flashes when it arrives. */
export function RecentTrades({ trades }: { trades: TradeRow[] }) {
  return (
    <>
      <div className="grid grid-cols-3 text-xs text-muted-foreground px-3 py-2">
        <span>Price(USDT)</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {trades.map((trade, index) => (
          <div
            key={`trade-${trade.time}-${index}`}
            className={`grid grid-cols-3 text-xs px-3 py-1 hover:bg-muted/30 cursor-pointer transition-all duration-300 ${
              trade.isNew ? (trade.side === "buy" ? "bg-trading-green/25 animate-fade-in" : "bg-trading-red/25 animate-fade-in") : ""
            }`}
          >
            <span
              className={`font-mono transition-all duration-200 ${trade.side === "buy" ? "text-trading-green" : "text-trading-red"} ${
                trade.isNew ? "font-semibold" : ""
              }`}
            >
              {trade.price.toFixed(4)}
            </span>
            <span className={`text-right font-mono transition-all duration-200 ${trade.isNew ? "text-foreground" : "text-muted-foreground"}`}>
              {formatInteger(trade.amount)}
            </span>
            <span className={`text-right font-mono transition-all duration-200 ${trade.isNew ? "text-foreground" : "text-muted-foreground"}`}>
              {trade.time}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
