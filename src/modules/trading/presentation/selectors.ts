import { isBinaryMarket, round4, sidePrice, toSide, type Market, type OrderSide } from "../domain";

/**
 * Price quoted for the chosen side: a binary market's selected option trades
 * at its own price; a multi-outcome option trades Yes at `p` and No at `1 − p`.
 */
export const quotePrice = (market: Market, optionPrice: number, side: OrderSide) =>
  isBinaryMarket(market.options) ? round4(optionPrice) : sidePrice(optionPrice, toSide(side));
