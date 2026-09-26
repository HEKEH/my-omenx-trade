"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { stepDecimals, withDepth, type OrderSide } from "../../../domain";
import { formatInteger } from "../../format";
import { useDismiss } from "../../hooks/useDismiss";
import { useOrderBook, type BookRow } from "../../hooks/useOrderBook";
import { useTradeFormActions } from "../../hooks/useTrade";
import { MarkPriceBadge } from "../MarkPriceBadge";
import { RecentTrades } from "./RecentTrades";

type ViewMode = "both" | "bids" | "asks";

const PRICE_STEPS = ["0.0001", "0.001", "0.01", "0.1", "1"] as const;

// The reference keeps these BTC-template column names (E-21, R-4).
const COLUMNS = { price: "Price(USDT)", qty: "Qty(BTC)", total: "Total(BTC)" };

const tabClass = (active: boolean) =>
  `text-sm font-medium transition-all ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`;

function ViewIcon({ bars }: { bars: ("red" | "green")[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {bars.map((color, index) => (
        <div key={index} className={`w-3 h-0.5 ${color === "red" ? "bg-trading-red" : "bg-trading-green"}`} />
      ))}
    </div>
  );
}

function LevelRow({
  row,
  kind,
  decimals,
  flash,
  onPick,
}: {
  row: BookRow;
  kind: "ask" | "bid";
  decimals: number;
  flash: boolean;
  onPick: (price: string) => void;
}) {
  const price = row.price.toFixed(decimals);
  const flashClass = flash && row.updated ? (kind === "ask" ? "flash-update-red" : "flash-update-green") : "";
  return (
    <div
      onClick={() => onPick(price)}
      className={`relative grid grid-cols-3 text-xs px-3 py-0.5 hover:bg-muted/30 cursor-pointer ${flash ? "transition-all" : ""} ${flashClass}`}
    >
      <div
        className={`absolute right-0 top-0 bottom-0 ${kind === "ask" ? "bg-trading-red/10" : "bg-trading-green/10"}`}
        style={{ width: `${row.depth}%` }}
      />
      <span className={`relative ${kind === "ask" ? "price-red" : "price-green"}`}>{price}</span>
      <span className="relative text-right text-muted-foreground font-mono">{formatInteger(row.amount)}</span>
      <span className="relative text-right text-muted-foreground font-mono">{formatInteger(row.total)}</span>
    </div>
  );
}

function CurrentPrice({ price, rising, bordered }: { price: number; rising: boolean; bordered: "y" | "t" }) {
  return (
    <div className={`px-3 py-2 ${bordered === "y" ? "border-y" : "border-t"} border-border/30`}>
      <div className="flex items-center gap-2">
        <span className={`text-lg font-bold font-mono ${rising ? "text-trading-green" : "text-trading-red"}`}>
          {rising ? "↑" : "↓"} {price.toFixed(4)}
        </span>
        <MarkPriceBadge price={price} />
      </div>
    </div>
  );
}

/** Order book / recent trades card (reference DesktopOrderBook.tsx). */
export function OrderBookCard({ optionId, side }: { optionId: string | undefined; side: OrderSide }) {
  const [tab, setTab] = useState<"orderbook" | "trades">("orderbook");
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const [step, setStep] = useState<(typeof PRICE_STEPS)[number]>("0.0001");
  const [stepOpen, setStepOpen] = useState(false);
  const stepRef = useRef<HTMLDivElement>(null);
  useDismiss([stepRef], stepOpen, () => setStepOpen(false));
  const book = useOrderBook(optionId, side, Number(step));
  const form = useTradeFormActions();
  const decimals = stepDecimals(Number(step));
  const pick = (price: string) => form.applyBookPrice(price);

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/30">
      <div className="flex items-center px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setTab("orderbook")} className={tabClass(tab === "orderbook")}>
            Order Book
          </button>
          <button type="button" onClick={() => setTab("trades")} className={tabClass(tab === "trades")}>
            Recent Trades
          </button>
        </div>
      </div>

      {tab === "trades" ? (
        <RecentTrades trades={book?.trades ?? []} />
      ) : (
        <>
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              {(
                [
                  ["both", ["red", "red", "green", "green"]],
                  ["bids", ["green", "green", "green"]],
                  ["asks", ["red", "red", "red"]],
                ] as const
              ).map(([mode, bars]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`w-5 h-5 flex items-center justify-center ${
                    viewMode === mode ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ViewIcon bars={[...bars]} />
                </button>
              ))}
            </div>
            <div ref={stepRef} className="relative">
              <button
                type="button"
                onClick={() => setStepOpen((open) => !open)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80 transition-colors"
              >
                {step}
                <ChevronDown className={`w-3 h-3 transition-transform ${stepOpen ? "rotate-180" : ""}`} />
              </button>
              {stepOpen && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded shadow-lg z-50 py-1 min-w-[60px]">
                  {PRICE_STEPS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setStep(option);
                        setStepOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left hover:bg-muted transition-colors ${
                        step === option ? "text-primary bg-muted/50" : "text-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 text-xs text-muted-foreground px-3 py-1">
            <span>{COLUMNS.price}</span>
            <span className="text-right">{COLUMNS.qty}</span>
            <span className="text-right">{COLUMNS.total}</span>
          </div>

          {book && viewMode === "both" && (
            <>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* Lowest ask sits next to the current price. */}
                {[...book.asks].reverse().map((row, index) => (
                  <LevelRow key={`ask-${row.price}-${index}`} row={row} kind="ask" decimals={decimals} flash onPick={pick} />
                ))}
              </div>
              <CurrentPrice price={book.midPrice} rising={book.rising} bordered="y" />
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {book.bids.map((row, index) => (
                  <LevelRow key={`bid-${row.price}-${index}`} row={row} kind="bid" decimals={decimals} flash onPick={pick} />
                ))}
              </div>
            </>
          )}

          {book && viewMode !== "both" && (
            <>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* Single-side views repeat the first 8 levels to fill the card, like the reference; depth bars are rescaled across the repeated list. */}
                {withDepth(viewMode === "bids" ? [...book.bids, ...book.bids.slice(0, 8)] : [...book.asks, ...book.asks.slice(0, 8)]).map(
                  (row, index) => (
                    <LevelRow
                      key={`${viewMode}-${index}`}
                      row={row}
                      kind={viewMode === "bids" ? "bid" : "ask"}
                      decimals={decimals}
                      flash={false}
                      onPick={pick}
                    />
                  ),
                )}
              </div>
              <CurrentPrice price={book.midPrice} rising={viewMode === "bids"} bordered="t" />
            </>
          )}

          {book && (
            <div className="px-3 py-2 border-t border-border/30">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs px-1 border border-trading-green text-trading-green">Y</span>
                  <span className="text-xs text-trading-green font-medium transition-all duration-300">
                    {Math.round(book.buyRatio)}%
                  </span>
                </div>
                <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden flex">
                  <div className="bg-trading-green transition-all duration-300" style={{ width: `${book.buyRatio}%` }} />
                  <div className="bg-trading-red transition-all duration-300" style={{ width: `${100 - book.buyRatio}%` }} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-trading-red font-medium transition-all duration-300">
                    {Math.round(100 - book.buyRatio)}%
                  </span>
                  <span className="text-xs px-1 border border-trading-red text-trading-red">N</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
