import { orderCost, round2 } from "../../domain";
import type {
  EventOptionRow,
  EventRow,
  OrderReservationRow,
  PositionRow,
  ProfileRow,
  Tables,
  TradeRow,
} from "../supabase-shape/rows";

export const MOCK_USER_ID = "mock-user";

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export type SeedTables = { [K in keyof Tables]: Tables[K][] };

interface EventSeed {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  rules: string[];
  volume: string;
  sourceName: string;
  sourceUrl: string;
  settlement: string;
  priceLabel?: string;
  sideLabels?: { yes: string; no: string };
  options: { id: string; label: string; price: number }[];
}

// The reference project's five mock events (src/data/events.ts), plus two
// binary Yes/No markets so the binary layout and netting rules are reachable.
const EVENTS: EventSeed[] = [
  {
    id: "1",
    name: "Elon Musk # tweets January 10 - January 17, 2026?",
    icon: "🐦",
    category: "social",
    description: "Predict the number of tweets from @elonmusk during the specified period.",
    rules: [
      "Counting period: January 10, 2026 00:00:00 UTC to January 17, 2026 23:59:59 UTC",
      "Only original tweets from @elonmusk are counted",
      "Deleted tweets that were posted during the period still count",
      "Market settles within 24 hours after the end date",
    ],
    volume: "$2.45M",
    sourceName: "View on X (Twitter)",
    sourceUrl: "https://x.com/elonmusk",
    settlement:
      "This market will be resolved based on the official tweet count from Elon Musk's verified X (Twitter) account (@elonmusk) as of the end date. Only original tweets count, excluding retweets and replies.",
    options: [
      { id: "1", label: "140-159", price: 0.0534 },
      { id: "2", label: "160-179", price: 0.1234 },
      { id: "3", label: "200-219", price: 0.3456 },
      { id: "4", label: "220-239", price: 0.2834 },
      { id: "5", label: "240-259", price: 0.1942 },
    ],
  },
  {
    id: "2",
    name: "Bitcoin price on January 31, 2026?",
    icon: "₿",
    category: "crypto",
    description: "Predict the closing price of Bitcoin (BTC/USD) on January 31, 2026 at 23:59:59 UTC.",
    rules: [
      "Settlement price is based on the CoinGecko BTC/USD price at exactly 23:59:59 UTC on January 31, 2026",
      "The price must be within the selected range at the exact settlement time",
      "In case of exchange downtime, the last available price will be used",
      "Market settles within 1 hour after the settlement time",
    ],
    volume: "$5.12M",
    sourceName: "View on CoinGecko",
    sourceUrl: "https://www.coingecko.com/en/coins/bitcoin",
    settlement:
      "This market will be resolved based on the CoinGecko BTC/USD price at the exact settlement time. The closing price must fall within the selected range for that option to settle at $1.00.",
    priceLabel: "BTC/USD",
    options: [
      { id: "1", label: "$80,000 - $90,000", price: 0.0823 },
      { id: "2", label: "$90,000 - $100,000", price: 0.1567 },
      { id: "3", label: "$100,000 - $110,000", price: 0.2891 },
      { id: "4", label: "$110,000 - $120,000", price: 0.2234 },
      { id: "5", label: "$120,000 - $130,000", price: 0.1456 },
      { id: "6", label: "$130,000 - $150,000", price: 0.0678 },
      { id: "7", label: "Above $150,000", price: 0.0251 },
      { id: "8", label: "Below $80,000", price: 0.01 },
    ],
  },
  {
    id: "3",
    name: "ETH/BTC ratio end of Q1 2026?",
    icon: "⟠",
    category: "crypto",
    description: "Predict the ETH/BTC trading ratio at the end of Q1 2026.",
    rules: ["Based on Binance ETH/BTC spot price", "Settlement at 23:59:59 UTC on March 31, 2026"],
    volume: "$1.89M",
    sourceName: "View on Binance",
    sourceUrl: "https://www.binance.com/en/trade/ETH_BTC",
    settlement: "This market will be resolved based on the Binance ETH/BTC spot price at the exact settlement time.",
    priceLabel: "ETH/BTC",
    options: [
      { id: "1", label: "0.030 - 0.035", price: 0.1234 },
      { id: "2", label: "0.035 - 0.040", price: 0.2567 },
      { id: "3", label: "0.040 - 0.045", price: 0.3123 },
      { id: "4", label: "0.045 - 0.050", price: 0.189 },
      { id: "5", label: "Above 0.050", price: 0.1186 },
    ],
  },
  {
    id: "4",
    name: "Fed interest rate decision January 2026?",
    icon: "🏦",
    category: "economics",
    description: "Predict the Federal Reserve interest rate decision for January 2026.",
    rules: ["Based on the official FOMC announcement", "Settlement immediately after the official press release"],
    volume: "$3.21M",
    sourceName: "View on Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    settlement: "This market will be resolved based on the official FOMC announcement and press release.",
    options: [
      { id: "1", label: "No Change", price: 0.4523 },
      { id: "2", label: "25bp Cut", price: 0.3567 },
      { id: "3", label: "50bp Cut", price: 0.1234 },
      { id: "4", label: "25bp Hike", price: 0.0456 },
      { id: "5", label: "50bp+ Cut", price: 0.022 },
    ],
  },
  {
    id: "5",
    name: "S&P 500 closing price December 2025?",
    icon: "📈",
    category: "finance",
    description: "Predict the S&P 500 index closing price on December 31, 2025.",
    rules: ["Based on the official NYSE closing price", "Settlement after market close on the last trading day of 2025"],
    volume: "$4.56M",
    sourceName: "View on NYSE",
    sourceUrl: "https://www.nyse.com/quote/index/SPX",
    settlement:
      "This market will be resolved based on the official NYSE S&P 500 closing price on the last trading day of 2025.",
    priceLabel: "S&P 500",
    options: [
      { id: "1", label: "5,800 - 6,000", price: 0.0912 },
      { id: "2", label: "6,000 - 6,200", price: 0.1823 },
      { id: "3", label: "6,200 - 6,400", price: 0.2567 },
      { id: "4", label: "6,400 - 6,600", price: 0.2345 },
      { id: "5", label: "6,600 - 6,800", price: 0.1453 },
      { id: "6", label: "Above 6,800", price: 0.09 },
    ],
  },
  {
    id: "6",
    name: "Will the Fed cut rates at the March 2026 meeting?",
    icon: "🏛️",
    category: "economics",
    description: "Resolves Yes if the FOMC lowers the target range at its March 2026 meeting.",
    rules: ["Based on the official FOMC statement", "Settlement immediately after the official press release"],
    volume: "$1.37M",
    sourceName: "View on Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    settlement: "This market will be resolved based on the official FOMC statement for the March 2026 meeting.",
    options: [
      { id: "1", label: "Yes", price: 0.62 },
      { id: "2", label: "No", price: 0.38 },
    ],
  },
  {
    id: "7",
    name: "Lakers vs Celtics: who wins on February 12, 2026?",
    icon: "🏀",
    category: "sports",
    description: "Resolves to the winner of the regular-season game on February 12, 2026.",
    rules: ["Based on the official NBA box score", "Overtime counts toward the result"],
    volume: "$860K",
    sourceName: "View on NBA.com",
    sourceUrl: "https://www.nba.com/schedule",
    settlement: "This market will be resolved based on the official NBA final score.",
    sideLabels: { yes: "Lakers", no: "Celtics" },
    options: [
      { id: "1", label: "Yes", price: 0.46 },
      { id: "2", label: "No", price: 0.54 },
    ],
  },
];

// Deterministic hourly funding rates within ±0.0002 so the stats strip is stable.
const FUNDING_RATES = [0.00005, -0.00003, 0.00012, 0.00008, -0.00011, 0.00002, 0.00015, -0.00006];

const iso = (ms: number) => new Date(ms).toISOString();

const buildEvent = (seed: EventSeed, index: number, now: number): EventRow => ({
  category: seed.category,
  created_at: iso(now - 7 * DAY_MS),
  description: seed.description,
  end_date: iso(now + (index + 1) * 5 * DAY_MS),
  external_links: null,
  icon: seed.icon,
  id: seed.id,
  is_resolved: false,
  name: seed.name,
  price_label: seed.priceLabel ?? null,
  rules: seed.rules.join("\n"),
  settled_at: null,
  settlement_description: seed.settlement,
  side_labels: seed.sideLabels ?? null,
  source_name: seed.sourceName,
  source_url: seed.sourceUrl,
  start_date: iso(now - 3 * DAY_MS),
  updated_at: iso(now - 7 * DAY_MS),
  volume: seed.volume,
  winning_option_id: null,
});

const buildOptions = (seed: EventSeed, eventIndex: number, now: number): EventOptionRow[] =>
  seed.options.map((option, optionIndex) => ({
    created_at: iso(now - 7 * DAY_MS),
    event_id: seed.id,
    final_price: null,
    funding_rate: FUNDING_RATES[(eventIndex + optionIndex) % FUNDING_RATES.length],
    // Option ids are globally unique: realtime prices are keyed by option id.
    id: `${seed.id}-${option.id}`,
    is_winner: null,
    label: option.label,
    next_funding_at: iso(now + (28 + optionIndex) * MINUTE_MS),
    price: option.price,
    updated_at: iso(now - 7 * DAY_MS),
  }));

const eventName = (id: string) => EVENTS.find((event) => event.id === id)!.name;

interface PositionSeed {
  id: string;
  eventId: string;
  optionId: string;
  optionLabel: string;
  side: "long" | "short";
  /** In the position's side space (a short holds the complement at 1 − p). */
  entryPrice: number;
  size: number;
  leverage: number;
  fundingAccrued: number;
  ageDays: number;
}

const POSITIONS: PositionSeed[] = [
  {
    id: "pos-1",
    eventId: "2",
    optionId: "2-3",
    optionLabel: "$100,000 - $110,000",
    side: "long",
    entryPrice: 0.265,
    size: 3459,
    leverage: 10,
    fundingAccrued: 0.42,
    ageDays: 2,
  },
  {
    id: "pos-2",
    eventId: "4",
    optionId: "4-1",
    optionLabel: "No Change",
    side: "short",
    entryPrice: 0.58,
    size: 500,
    leverage: 5,
    fundingAccrued: -0.18,
    ageDays: 1,
  },
  {
    id: "pos-3",
    eventId: "6",
    optionId: "6-1",
    optionLabel: "Yes",
    side: "long",
    entryPrice: 0.55,
    size: 200,
    leverage: 2,
    fundingAccrued: 0,
    ageDays: 0.5,
  },
];

const buildPosition = (seed: PositionSeed, now: number): PositionRow => {
  const created = now - seed.ageDays * DAY_MS;
  return {
    closed_at: null,
    created_at: iso(created),
    entry_price: seed.entryPrice,
    event_name: eventName(seed.eventId),
    funding_accrued: seed.fundingAccrued,
    id: seed.id,
    last_funding_at: iso(now - 30 * MINUTE_MS),
    leverage: seed.leverage,
    margin: orderCost({ price: seed.entryPrice, quantity: seed.size, leverage: seed.leverage, reducing: false })
      .margin,
    mark_price: seed.entryPrice,
    option_id: seed.optionId,
    option_label: seed.optionLabel,
    pnl: 0,
    pnl_percent: 0,
    side: seed.side,
    size: seed.size,
    sl_mode: null,
    sl_value: null,
    status: "Open",
    tp_mode: null,
    tp_value: null,
    trade_id: `trade-${seed.id}`,
    updated_at: iso(created),
    user_id: MOCK_USER_ID,
  };
};

interface OrderSeed {
  id: string;
  eventId: string;
  optionLabel: string;
  price: number;
  quantity: number;
  leverage: number;
  ageMinutes: number;
}

const PENDING_ORDERS: OrderSeed[] = [
  { id: "order-1", eventId: "1", optionLabel: "200-219", price: 0.32, quantity: 1000, leverage: 10, ageMinutes: 5 },
  { id: "order-2", eventId: "7", optionLabel: "No", price: 0.5, quantity: 300, leverage: 3, ageMinutes: 42 },
];

const buildOrder = (seed: OrderSeed, now: number): TradeRow => {
  const cost = orderCost({ price: seed.price, quantity: seed.quantity, leverage: seed.leverage, reducing: false });
  const created = iso(now - seed.ageMinutes * MINUTE_MS);
  return {
    amount: cost.margin,
    closed_at: null,
    created_at: created,
    event_name: eventName(seed.eventId),
    fee: cost.fee,
    funding_paid: 0,
    id: seed.id,
    leverage: seed.leverage,
    margin: cost.margin,
    option_label: seed.optionLabel,
    order_type: "Limit",
    pnl: null,
    price: seed.price,
    quantity: seed.quantity,
    side: "buy",
    sl_mode: null,
    sl_value: null,
    status: "Pending",
    tp_mode: null,
    tp_value: null,
    updated_at: created,
    user_id: MOCK_USER_ID,
  };
};

/** Funds a pending order holds; the snapshot guards against later edits. */
export const reservationFor = (trade: TradeRow): OrderReservationRow => ({
  trade_id: trade.id,
  user_id: trade.user_id,
  trial_amount: 0,
  real_amount: round2(trade.margin + trade.fee),
  order_snapshot: orderSnapshot(trade),
});

export const orderSnapshot = (trade: TradeRow) => [
  trade.event_name,
  trade.option_label,
  trade.side,
  trade.order_type,
  trade.price,
  trade.amount,
  trade.quantity,
  trade.leverage,
  trade.margin,
  trade.fee,
];

const buildProfile = (now: number): ProfileRow => ({
  auth_method: "demo",
  avatar_url: null,
  balance: 10000,
  created_at: iso(now - 30 * DAY_MS),
  email: null,
  id: "profile-mock-user",
  totp_enabled: false,
  // Kept for schema parity; trial balance takes no part in trading.
  trial_balance: 0,
  updated_at: iso(now - 30 * DAY_MS),
  user_id: MOCK_USER_ID,
  username: "demo-trader",
  withdraw_2fa_mode: "off",
});

/** Initial contents of every table, dated relative to `now`. */
export const buildSeed = (now: Date = new Date()): SeedTables => {
  const time = now.getTime();
  const trades = PENDING_ORDERS.map((order) => buildOrder(order, time));
  return {
    events: EVENTS.map((event, index) => buildEvent(event, index, time)),
    event_options: EVENTS.flatMap((event, index) => buildOptions(event, index, time)),
    profiles: [buildProfile(time)],
    positions: POSITIONS.map((position) => buildPosition(position, time)),
    trades,
    position_funding_ledger: [],
    binary_order_reservations: trades.map(reservationFor),
  };
};
