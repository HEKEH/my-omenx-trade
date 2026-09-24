import type { ReactNode } from "react";

interface TradeLayoutProps {
  header: ReactNode;
  /** Only multi-outcome events show the option chips row. */
  optionChips?: ReactNode;
  chart: ReactNode;
  orderBook: ReactNode;
  bottomPanel: ReactNode;
  tradeForm: ReactNode;
  riskCard?: ReactNode;
}

/**
 * Full-screen desktop trading terminal. Container classes follow the
 * reference layout (DesktopTrading.tsx:683-1853): a left column with the
 * chart and order book above the positions panel, and a fixed 280px right
 * column with the trade form and account risk card.
 */
export function TradeLayout({ header, optionChips, chart, orderBook, bottomPanel, tradeForm, riskCard }: TradeLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {header}
      {optionChips}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* min-h matches the trade panel's natural height so the order book bottom lines up */}
          <div className="flex items-stretch min-h-[680px] gap-1 p-1">
            <div className="flex-1 flex flex-col min-w-0 bg-background rounded border border-border/30">{chart}</div>
            <div className="w-[280px] flex-shrink-0 flex flex-col bg-background rounded border border-border/30 overflow-hidden">
              {orderBook}
            </div>
          </div>
          <div className="border-t border-border/30 flex-shrink-0">{bottomPanel}</div>
        </div>

        <div className="w-[280px] flex-shrink-0 flex flex-col gap-2 m-1 overflow-y-auto">
          <div className="flex flex-col bg-background rounded-lg border border-border/50 flex-shrink-0">{tradeForm}</div>
          {riskCard && <div className="bg-background rounded-lg border border-border/50 flex-shrink-0">{riskCard}</div>}
        </div>
      </div>
    </div>
  );
}
