/**
 * UI copy for the trade page. The reference has no i18n; strings are English
 * and table/label terms follow its `tradingTerms.ts`.
 */
export const TERMS = {
  QTY: "Qty",
  ENTRY_PRICE: "Entry Price",
  MARK_PRICE: "Mark Price",
  LIQ_PRICE: "Liq. Price",
  PRICE: "Price",
  VALUE: "Value",
  MARGIN: "Margin",
  LEVERAGE: "Leverage",
  SIDE: "Side",
  UNREALIZED_PNL: "Unrealized P&L",
  TPSL: "TP/SL",
  TAKE_PROFIT: "Take Profit",
  STOP_LOSS: "Stop Loss",
  ORDER_TYPE: "Order Type",
  MARKET: "Market",
  LIMIT: "Limit",
  STATUS: "Status",
  TIME: "Time",
  CONTRACTS: "Contracts",
  ACTION: "Action",
  CLOSE: "Close",
} as const;

export const PAGE_COPY = {
  loading: "Loading events...",
  noEvents: "No events available",
  noEventsHint: "Please check back later for new trading events.",
  returnHome: "Return to Home",
  eventEnded: "Event Has Ended",
  eventEndedHint:
    "The event you're looking for has already been settled or is no longer available for trading.",
  eventId: "Event ID",
  viewSettled: "View Settled Events",
  browseActive: "Browse Active Events",
} as const;
