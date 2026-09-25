import { cents, needsSideToggle, outcomeAlias, outcomeName, type Outcome, type SportsMarket } from "../market";

export type YesNo = "yes" | "no";
export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";

/** Taker fee on notional (reference TradeForm.tsx:78). */
export const FEE_RATE = 0.002;
export const LEVERAGE_MIN = 1;
export const LEVERAGE_MAX = 20;
export const DEFAULT_MARGIN = 100;
export const QUICK_MARGIN_PCTS = [25, 50, 75, 100] as const;
/**
 * The reference page renders the form without a balance, so it uses the form's default of
 * 5000 while the top bar shows $1,240.50 (dev reference BUG-1).
 */
export const REFERENCE_FORM_BALANCE = 5000;

export interface Ticket {
  selected: Outcome;
  needsSideToggle: boolean;
  formOutcome: YesNo;
  formLabel: string;
  /** Form price in ¢. */
  formPrice: number;
}

/**
 * What the order form trades for the current selection (reference TradeOutcomePicker.tsx
 * deriveTradeFormProps). 3+ outcomes: the chosen side of the chosen outcome. Binary: the
 * chosen outcome itself; the first outcome is the YES tone.
 */
export function deriveTicket({ market, outcomeId, side }: { market: SportsMarket; outcomeId?: string; side: YesNo }): Ticket {
  const ranked = [...market.outcomes].sort((a, b) => b.price - a.price);
  const selected = market.outcomes.find((o) => o.id === outcomeId) ?? ranked[0] ?? market.outcomes[0];
  const toggle = needsSideToggle(market);
  const yesCents = cents(selected.price);
  const isBinary = market.outcomes.length === 2;

  const formOutcome: YesNo = toggle ? side : isBinary ? (selected.id === market.outcomes[0]?.id ? "yes" : "no") : "yes";
  const formLabel = toggle ? `${outcomeAlias(selected)} ${side === "yes" ? "YES" : "NO"}` : outcomeName(selected);
  const formPrice = toggle ? (side === "yes" ? yesCents : 100 - yesCents) : yesCents;
  return { selected, needsSideToggle: toggle, formOutcome, formLabel, formPrice };
}

export interface OrderQuote {
  /** Execution (market) or limit price in ¢. */
  px: number;
  notional: number;
  shares: number;
  fee: number;
  /** PnL at settlement if this side wins, net of the fee. */
  pnlAtSettle: number;
  /** Display-only liquidation price in ¢; 0 at 1×. */
  liq: number;
}

/**
 * Order estimate (reference TradeForm.tsx:74-90). Notional = margin × leverage; contracts =
 * notional ÷ price. A limit price that is not a number falls back to the market price
 * (BUG-6). The liquidation price uses 90% of the balance as the buffer.
 */
export function quoteOrder(input: {
  type: OrderType;
  /** Form price in ¢. */
  price: number;
  limitInput: string;
  margin: number;
  leverage: number;
  outcome: YesNo;
  balance: number;
}): OrderQuote {
  const { type, price, limitInput, margin, leverage, outcome, balance } = input;
  const px = type === "market" ? price : Number(limitInput) || price;
  const notional = margin * leverage;
  const shares = px > 0 ? notional / (px / 100) : 0;
  const fee = notional * FEE_RATE;
  const pnlAtSettle = (1 - px / 100) * notional - fee;
  let liq = 0;
  if (!(leverage <= 1 || notional <= 0)) {
    const buffer = ((balance * 0.9) / notional) * 100;
    const raw = outcome === "yes" ? px - buffer : px + buffer;
    liq = Math.max(1, Math.min(99, Math.round(raw)));
  }
  return { px, notional, shares, fee, pnlAtSettle, liq };
}

/** Margin for a quick-percentage button. */
export const quickMargin = (balance: number, pct: number) => Math.round((balance * pct) / 100);

/** Submit button text: leverage shown only above 1×. */
export function ctaLabel({ side, label, leverage, px }: { side: OrderSide; label: string; leverage: number; px: number }): string {
  const action = side === "buy" ? "Buy" : "Sell";
  return leverage > 1 ? `${action} ${label} ${leverage}× @ ${Math.round(px)}¢` : `${action} ${label} @ ${Math.round(px)}¢`;
}

/** The submit button reads "Fix TP / SL" while a target is invalid (TradeForm.tsx:120). */
export const formCta = ({ hasTpSlError, base }: { hasTpSlError: boolean; base: string }) => (hasTpSlError ? "Fix TP / SL" : base);

/** TP / SL inputs: empty is unset, anything else goes through Number (so "abc" is NaN, out of range). */
export const parseTpSlInput = (value: string): number | null => (value === "" ? null : Number(value));

/** Margin input: anything that is not a number (or is 0) reads as 0. */
export const parseMarginInput = (value: string): number => Number(value) || 0;

export type OrderProblem = "tpsl" | "no-margin" | "insufficient";

/** The first reason a submit is refused (reference TradeForm.tsx:122-137). */
export function orderProblem({ hasTpSlError, margin, balance }: { hasTpSlError: boolean; margin: number; balance: number }): OrderProblem | null {
  if (hasTpSlError) return "tpsl";
  if (margin <= 0) return "no-margin";
  if (margin > balance) return "insufficient";
  return null;
}

/** An order handed to the page after a successful submit (reference PlacedOrder). */
export interface PlacedOrder {
  side: OrderSide;
  type: OrderType;
  outcome: YesNo;
  outcomeLabel: string;
  /** Execution / limit price in ¢, rounded. */
  price: number;
  margin: number;
  leverage: number;
  notional: number;
  shares: number;
  fee: number;
  liq: number;
  tp: number | null;
  sl: number | null;
  label: string;
}

export function buildPlacedOrder(input: {
  side: OrderSide;
  type: OrderType;
  outcome: YesNo;
  outcomeLabel: string;
  margin: number;
  leverage: number;
  quote: OrderQuote;
  tp: number | null;
  sl: number | null;
}): PlacedOrder {
  const { side, type, outcome, outcomeLabel, margin, leverage, quote, tp, sl } = input;
  return {
    side,
    type,
    outcome,
    outcomeLabel,
    price: Math.round(quote.px),
    margin,
    leverage,
    notional: quote.notional,
    shares: quote.shares,
    fee: quote.fee,
    liq: quote.liq,
    tp,
    sl,
    label: ctaLabel({ side, label: outcomeLabel, leverage, px: quote.px }),
  };
}
