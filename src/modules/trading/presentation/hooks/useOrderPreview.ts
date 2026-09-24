"use client";

import { useMemo } from "react";
import { quoteOrder, type MarketListing, type OrderQuote, type OrderTicket, type TpSlSetting } from "../../application";
import {
  amountForQuantity,
  estimateTpSlPnl,
  quotePrice,
  resolveTpSlPrice,
  type Market,
  type OrderSide,
  type OutcomeOption,
  type TpSlKind,
} from "../../domain";
import type { TradeFormState } from "../stores/tradeFormStore";
import { useTrade, useTradeForm } from "./useTrade";

const parse = (text: string) => {
  const value = Number.parseFloat(text.replace(/,/g, ""));
  return Number.isFinite(value) ? value : 0;
};

export interface TpSlPreview {
  target: number;
  pnl: number;
}

export interface OrderFormPreview {
  ticket: OrderTicket;
  quote: OrderQuote;
  /** Price shown in the limit input when the user has not typed one. */
  marketPrice: number;
  hasSize: boolean;
  tp: TpSlPreview | null;
  sl: TpSlPreview | null;
}

const tpSlPreview = (form: TradeFormState, kind: TpSlKind, basePrice: number, quantity: number): TpSlPreview | null => {
  const raw = kind === "tp" ? form.tpValue : form.slValue;
  if (!form.tpSlEnabled || !raw) return null;
  const mode = kind === "tp" ? form.tpMode : form.slMode;
  const target = resolveTpSlPrice({ kind, mode, value: parse(raw), basePrice });
  return { target, pnl: estimateTpSlPnl({ target, basePrice, quantity }) };
};

const tpSlSetting = (preview: TpSlPreview | null): TpSlSetting | undefined =>
  preview ? { value: preview.target, mode: "$" } : undefined;

/**
 * Everything the order form shows, from the form, live prices, positions and
 * pending orders. All figures come from the domain (via `quoteOrder`).
 */
export function useOrderPreview(
  listing: MarketListing,
  market: Market,
  option: OutcomeOption | undefined,
  side: OrderSide,
): OrderFormPreview | null {
  const form = useTradeForm((state) => state);
  const positions = useTrade((state) => state.positions);
  const orders = useTrade((state) => state.orders);

  return useMemo(() => {
    if (!option) return null;
    const marketPrice = quotePrice(market, option.price, side);
    const price = form.orderType === "Limit" ? (form.limitPrice ? parse(form.limitPrice) : marketPrice) : marketPrice;
    // In qty mode the input is contracts; convert to the margin-sized amount the domain prices from.
    const amount =
      form.inputMode === "qty" ? amountForQuantity(parse(form.size), form.leverage, price) : parse(form.size);
    const draft: OrderTicket = {
      listing: { ...listing, market },
      optionId: option.id,
      side,
      orderType: form.orderType,
      amount,
      leverage: form.leverage,
      limitPrice: form.orderType === "Limit" ? price : undefined,
    };
    const quote = quoteOrder(draft, { positions, pendingOrders: orders });
    const tp = tpSlPreview(form, "tp", quote.price, quote.preview.quantity);
    const sl = tpSlPreview(form, "sl", quote.price, quote.preview.quantity);
    return {
      ticket: { ...draft, tp: tpSlSetting(tp), sl: tpSlSetting(sl) },
      quote,
      marketPrice,
      hasSize: amount > 0,
      tp,
      sl,
    };
  }, [listing, market, option, side, form, positions, orders]);
}
