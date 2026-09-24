import type {
  BookLevel,
  Market,
  OrderBook,
  OrderSide,
  OrderType,
  PendingOrderSnapshot,
  PositionSnapshot,
} from "../domain";

/*
 * Ports: what the application layer needs from the outside world. The mock
 * backend implements them today; a real Supabase backend would implement the
 * same interfaces.
 */

/** An event as the trade page shows it: the domain market plus display metadata. */
export interface MarketListing {
  market: Market;
  startDate: Date | null;
  icon: string;
  category: string;
  volume: string | null;
  priceLabel: string | null;
  description: string | null;
  rules: string[];
  sourceName: string | null;
  sourceUrl: string | null;
  settlement: string | null;
  /** Per-option funding: hourly rate and next refresh. */
  funding: Record<string, { ratePerHour: number; nextFundingAt: string | null }>;
}

export interface AccountView {
  userId: string;
  balance: number;
}

export interface TpSlSetting {
  value: number;
  mode: "%" | "$";
}

export interface PositionView extends PositionSnapshot {
  optionId: string | null;
  leverage: number;
  tp: TpSlSetting | null;
  sl: TpSlSetting | null;
  lastFundingAt: string | null;
}

export interface OrderView extends PendingOrderSnapshot {
  id: string;
  orderType: OrderType;
  price: number;
  /** Margin-sized USDC amount the order was placed with. */
  amount: number;
  createdAt: string;
}

export interface FundingLedgerEntry {
  id: string;
  appliedRate: number;
  notional: number;
  amount: number;
  accrualStart: string;
  accrualEnd: string;
  createdAt: string;
}

export interface MarketRepository {
  listActiveMarkets(): Promise<MarketListing[]>;
}

export interface AccountRepository {
  getAccount(): Promise<AccountView>;
  applyBalanceDelta(delta: number): Promise<AccountView>;
}

export interface PositionRepository {
  listOpen(): Promise<PositionView[]>;
  fundingHistory(positionId: string): Promise<FundingLedgerEntry[]>;
  updateTpSl(positionId: string, tp: TpSlSetting | null, sl: TpSlSetting | null): Promise<void>;
}

export interface OrderRepository {
  listPending(): Promise<OrderView[]>;
}

export interface PlaceOrderCommand {
  eventName: string;
  optionId: string;
  optionLabel: string;
  side: OrderSide;
  orderType: OrderType;
  price: number;
  amount: number;
  quantity: number;
  leverage: number;
  margin: number;
  fee: number;
  tp?: TpSlSetting;
  sl?: TpSlSetting;
}

export type TradeIntent = "open" | "add" | "reduce" | "close";

export interface PlaceOrderOutcome {
  intent: TradeIntent;
  status: "Filled" | "Pending";
  balanceDelta: number;
}

export interface ClosePositionCommand {
  positionId: string;
  quantity: number;
  /** Close price in the position's side space (the live mark). */
  closePrice: number;
}

export interface ClosePositionOutcome {
  closedQuantity: number;
  realizedPnl: number;
  releasedMargin: number;
  fee: number;
  balanceDelta: number;
  fullyClosed: boolean;
  remainingSize: number;
}

/** Order execution against the backend. */
export interface TradingGateway {
  placeOrder(command: PlaceOrderCommand): Promise<PlaceOrderOutcome>;
  cancelOrder(orderId: string): Promise<void>;
  closePosition(command: ClosePositionCommand): Promise<ClosePositionOutcome>;
  accrueFunding(positionId?: string): Promise<void>;
}

export type Unsubscribe = () => void;

export interface PriceUpdate {
  optionId: string;
  eventId: string;
  price: number;
  previousPrice: number | null;
  /** Funding carried on the same row; refreshed hourly by the backend. */
  funding: { ratePerHour: number; nextFundingAt: string | null };
  at: string;
}

/** Live pushes from the backend (Supabase Realtime in the reference). */
export interface RealtimeFeed {
  onPrice(listener: (update: PriceUpdate) => void): Unsubscribe;
  onPositionsChanged(listener: () => void): Unsubscribe;
  onOrdersChanged(listener: () => void): Unsubscribe;
}

export interface RecentTrade {
  price: number;
  amount: number;
  /** "HH:MM:SS" */
  time: string;
  side: OrderSide;
}

/** The underlying quantity an event tracks (tweet count, asset price), shown in the header. */
export interface ReferenceIndicator {
  kind: "tweets" | "price";
  value: string;
  /** e.g. "+1.56%" */
  change24h?: string;
}

export interface MarketStats {
  volume24h: string;
  openInterest: string;
  /** Absent for events without a tracked quantity; the header then hides the indicator. */
  indicator: ReferenceIndicator | null;
}

export interface MarketDataSnapshot {
  book: OrderBook<BookLevel>;
  trades: RecentTrade[];
  /** Set only on the tick a new trade arrived. */
  newTrade: RecentTrade | null;
  midPrice: number;
  /** Share of Yes-side volume, 10–90. */
  buyRatio: number;
}

/**
 * Order book, trades and stats around an option's live price, in the option's
 * (Yes) price space; callers mirror it for the No side. The reference
 * generates these client-side; there is no backend API.
 */
export interface MarketDataFeed {
  subscribe(optionId: string, listener: (snapshot: MarketDataSnapshot) => void): Unsubscribe;
  stats(eventId: string): MarketStats;
}

