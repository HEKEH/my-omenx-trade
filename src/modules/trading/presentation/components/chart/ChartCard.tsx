"use client";

import { priceChangePercent, quotePrice, type Market, type OrderSide, type OutcomeOption } from "../../../domain";
import { useTrade } from "../../hooks/useTrade";
import { MarkPriceBadge } from "../MarkPriceBadge";

interface ChartCardProps {
  market: Market;
  option: OutcomeOption | undefined;
  side: OrderSide;
}

/**
 * Chart card: tab bar, price bar and the chart area. The candlestick chart
 * itself comes last (A-10, M11); until then the area is a placeholder of the
 * same size. Event Info is out of scope (A-2), so only the Chart tab remains.
 */
export function ChartCard({ market, option, side }: ChartCardProps) {
  const openPrice = useTrade((state) => (option ? state.openPrices[option.id] : undefined));
  const price = option ? quotePrice(market, option.price, side) : 0;
  const base = option && openPrice !== undefined ? quotePrice(market, openPrice, side) : price;
  const change = priceChangePercent(price, base);

  return (
    <>
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border/30">
        <button type="button" className="text-sm font-medium transition-all text-foreground">
          Chart
        </button>
      </div>
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border/30">
        <span className="text-2xl font-bold font-mono">{price.toFixed(4)}</span>
        <span className={`text-sm font-mono ${change >= 0 ? "text-trading-green" : "text-trading-red"}`}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </span>
        <MarkPriceBadge price={price} />
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center text-sm text-muted-foreground">
        Chart coming soon
      </div>
    </>
  );
}
