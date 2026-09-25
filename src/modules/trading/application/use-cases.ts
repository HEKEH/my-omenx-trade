import {
  DomainError,
  classifyOrderIntent,
  computeOrderPreview,
  findOption,
  fundingPerHour,
  isBinaryMarket,
  isBlocked,
  isReducing,
  orderCost,
  positionDetail,
  quotePrice,
  round4,
  sidePrice,
  validateOrder,
  type OrderIntent,
  type OrderPreview,
  type OrderSide,
  type OrderType,
} from "../domain";
import type {
  AccountRepository,
  ClosePositionOutcome,
  MarketDataFeed,
  MarketListing,
  MarketRepository,
  OrderRepository,
  PlaceOrderOutcome,
  PositionRepository,
  PositionView,
  TpSlSetting,
  RealtimeFeed,
  TradingGateway,
} from "./ports";

export interface TradingDeps {
  account: AccountRepository;
  positions: PositionRepository;
  orders: OrderRepository;
  gateway: TradingGateway;
}

/** What the page runs on: the ports only, whatever backend implements them. */
export interface TradingRuntime {
  deps: TradingDeps;
  markets: MarketRepository;
  realtime: RealtimeFeed;
  marketData: MarketDataFeed;
  /** Starts the background jobs. */
  start(): void;
  stop(): void;
}

/** The signed-in user's balance, open positions and pending orders. */
export const loadPortfolio = async (deps: TradingDeps) => {
  const [account, positions, orders] = await Promise.all([
    deps.account.getAccount(),
    deps.positions.listOpen(),
    deps.orders.listPending(),
  ]);
  return { account, positions, orders };
};

export interface OrderTicket {
  listing: MarketListing;
  optionId: string;
  side: OrderSide;
  orderType: OrderType;
  /** Margin-sized USDC amount. */
  amount: number;
  leverage: number;
  /** Required for limit orders: the price the order rests at. */
  limitPrice?: number;
  tp?: TpSlSetting;
  sl?: TpSlSetting;
}

/**
 * Price an order trades at. A binary market quotes each option's own price;
 * a multi-outcome option trades Yes at `p` and No at `1 − p`. A limit order
 * trades at its limit (the reference ignored the limit input).
 */
export const orderPrice = (ticket: Pick<OrderTicket, "listing" | "optionId" | "side" | "orderType" | "limitPrice">) => {
  if (ticket.orderType === "Limit") return round4(ticket.limitPrice ?? Number.NaN);
  const { market } = ticket.listing;
  const option = findOption(market, ticket.optionId);
  if (!option) return Number.NaN;
  return quotePrice(market, option.price, ticket.side);
};

export interface OrderQuote {
  price: number;
  preview: OrderPreview;
  intent: OrderIntent;
  /** Cost by the server's rules, given the intent (no margin when reducing). */
  cost: ReturnType<typeof orderCost>;
}

/** Everything the order form shows before submitting, from current positions and orders. */
export const quoteOrder = (
  ticket: OrderTicket,
  context: { positions: readonly PositionView[]; pendingOrders: Parameters<typeof classifyOrderIntent>[0]["pendingOrders"] },
): OrderQuote => {
  const { market } = ticket.listing;
  const option = findOption(market, ticket.optionId);
  const price = orderPrice(ticket);
  const preview = computeOrderPreview({ amount: ticket.amount, leverage: ticket.leverage, price });
  const intent = classifyOrderIntent({
    positions: context.positions,
    pendingOrders: context.pendingOrders,
    eventName: market.name,
    optionLabel: option?.label ?? "",
    side: ticket.side,
    quantity: preview.quantity,
    price,
    leverage: ticket.leverage,
    binary: isBinaryMarket(market.options),
  });
  const cost = orderCost({ price, quantity: preview.quantity, leverage: ticket.leverage, reducing: isReducing(intent.kind) });
  return { price, preview, intent, cost };
};

const VIOLATION_MESSAGES: Record<string, string> = {
  "invalid-price": "Enter a price between 0 and 1.",
  "invalid-amount": "Enter an amount greater than 0.",
  "invalid-quantity": "The amount is too small to buy a whole contract.",
  "invalid-leverage": "Leverage must be between 1x and 10x.",
  "invalid-order-type": "Unsupported order type.",
  "invalid-side": "Binary markets only accept buy orders.",
  "margin-too-small": "Opening margin is too small.",
  "insufficient-balance": "Insufficient balance.",
};

/** Validates and submits an order. */
export const placeOrder = async (deps: TradingDeps, ticket: OrderTicket) => {
  const [positions, pendingOrders, account] = await Promise.all([
    deps.positions.listOpen(),
    deps.orders.listPending(),
    deps.account.getAccount(),
  ]);
  const quote = quoteOrder(ticket, { positions, pendingOrders });
  if (isBlocked(quote.intent.kind)) {
    throw new DomainError(quote.intent.kind, quote.intent.blockReason ?? "Order unavailable.");
  }

  const { market } = ticket.listing;
  const binary = isBinaryMarket(market.options);
  const violations = validateOrder({
    price: quote.price,
    amount: ticket.amount,
    quantity: quote.preview.quantity,
    leverage: ticket.leverage,
    orderType: ticket.orderType,
    total: quote.cost.total,
    availableBalance: account.balance,
    side: ticket.side,
    binary,
    margin: quote.cost.margin,
    reducing: isReducing(quote.intent.kind),
  });
  if (violations.length > 0) {
    const [first] = violations;
    const message =
      first === "insufficient-balance"
        ? `Insufficient balance. You need ${quote.cost.total.toFixed(2)} USDC but only have ${account.balance.toFixed(2)} USDC.`
        : VIOLATION_MESSAGES[first];
    throw new DomainError(first, message);
  }

  const option = findOption(market, ticket.optionId)!;
  const outcome: PlaceOrderOutcome = await deps.gateway.placeOrder({
    eventName: market.name,
    optionId: option.id,
    optionLabel: option.label,
    side: ticket.side,
    orderType: ticket.orderType,
    price: quote.price,
    amount: ticket.amount,
    quantity: quote.preview.quantity,
    leverage: ticket.leverage,
    margin: quote.cost.margin,
    fee: quote.cost.fee,
    tp: ticket.tp,
    sl: ticket.sl,
  });
  return { outcome, quote };
};

export const cancelOrder = (deps: TradingDeps, orderId: string) => deps.gateway.cancelOrder(orderId);

/** Live mark of a position in its own side space; falls back to entry when no price is known. */
export const markPriceOf = (position: PositionView, livePrices: Record<string, number>) => {
  const optionPrice = position.optionId ? livePrices[position.optionId] : undefined;
  return optionPrice === undefined ? position.entryPrice : sidePrice(optionPrice, position.side);
};

/** Closes part or all of a position at the live mark, after settling funding. */
export const closePosition = async (
  deps: TradingDeps,
  { positionId, quantity, livePrices }: { positionId: string; quantity: number; livePrices: Record<string, number> },
): Promise<ClosePositionOutcome> => {
  await deps.gateway.accrueFunding(positionId);
  const position = (await deps.positions.listOpen()).find((row) => row.id === positionId);
  if (!position) throw new DomainError("position-not-found", "This position is no longer open.");
  return deps.gateway.closePosition({ positionId, quantity, closePrice: markPriceOf(position, livePrices) });
};

export const updateTpSl = (deps: TradingDeps, positionId: string, tp: TpSlSetting | null, sl: TpSlSetting | null) =>
  deps.positions.updateTpSl(positionId, tp, sl);

/** Figures and funding history for the position detail dialog. */
export const getPositionDetail = async (
  deps: TradingDeps,
  {
    position,
    livePrices,
    funding,
  }: {
    position: PositionView;
    livePrices: Record<string, number>;
    funding: { ratePerHour: number; nextFundingAt: string | null } | undefined;
  },
) => {
  const markPrice = markPriceOf(position, livePrices);
  const detail = positionDetail({ position, markPrice });
  const ratePerHour = funding?.ratePerHour ?? 0;
  const history = await deps.positions.fundingHistory(position.id);
  return {
    ...detail,
    markPrice,
    ratePerHour,
    nextFundingAt: funding?.nextFundingAt ?? null,
    funding: fundingPerHour({ side: position.side, ratePerHour, notional: detail.notional }),
    history,
  };
};
