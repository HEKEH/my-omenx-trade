/**
 * Row and payload shapes of the backend the trade page talks to. They mirror
 * the reference project's Supabase schema (generated `types.ts` and the
 * `binary_market_netting` migration) field for field, so the mock backend can
 * be swapped for the real one without touching callers.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface EventRow {
  category: string;
  created_at: string;
  description: string | null;
  end_date: string | null;
  external_links: Json | null;
  icon: string;
  id: string;
  is_resolved: boolean;
  name: string;
  price_label: string | null;
  rules: string | null;
  settled_at: string | null;
  settlement_description: string | null;
  side_labels: Json | null;
  source_name: string | null;
  source_url: string | null;
  start_date: string | null;
  updated_at: string;
  volume: string | null;
  winning_option_id: string | null;
}

export interface EventOptionRow {
  created_at: string;
  event_id: string;
  final_price: number | null;
  funding_rate: number;
  id: string;
  is_winner: boolean | null;
  label: string;
  next_funding_at: string | null;
  price: number;
  updated_at: string;
}

export interface ProfileRow {
  auth_method: string | null;
  avatar_url: string | null;
  balance: number | null;
  created_at: string;
  email: string | null;
  id: string;
  totp_enabled: boolean;
  trial_balance: number | null;
  updated_at: string;
  user_id: string;
  username: string | null;
  withdraw_2fa_mode: string;
}

export interface PositionRow {
  closed_at: string | null;
  created_at: string;
  entry_price: number;
  event_name: string;
  funding_accrued: number;
  id: string;
  last_funding_at: string | null;
  leverage: number;
  margin: number;
  mark_price: number;
  option_id: string | null;
  option_label: string;
  pnl: number | null;
  pnl_percent: number | null;
  /** "long" | "short" */
  side: string;
  size: number;
  sl_mode: string | null;
  sl_value: number | null;
  /** "Open" | "Closed" */
  status: string;
  tp_mode: string | null;
  tp_value: number | null;
  trade_id: string | null;
  updated_at: string;
  user_id: string;
}

export interface TradeRow {
  amount: number;
  closed_at: string | null;
  created_at: string;
  event_name: string;
  fee: number;
  funding_paid: number;
  id: string;
  leverage: number;
  margin: number;
  option_label: string;
  /** "Market" | "Limit" */
  order_type: string;
  pnl: number | null;
  price: number;
  quantity: number;
  /** "buy" | "sell" */
  side: string;
  sl_mode: string | null;
  sl_value: number | null;
  /** "Pending" | "Partial Filled" | "Filled" | "Cancelled" | "Closed" */
  status: string;
  tp_mode: string | null;
  tp_value: number | null;
  updated_at: string;
  user_id: string;
}

export interface FundingLedgerRow {
  accrual_end: string;
  accrual_start: string;
  amount: number;
  applied_rate: number;
  created_at: string;
  event_name: string;
  id: string;
  notional: number;
  option_id: string | null;
  position_id: string;
  user_id: string;
}

/** Server-internal: funds held by a pending limit order (not readable by clients). */
export interface OrderReservationRow {
  trade_id: string;
  user_id: string;
  trial_amount: number;
  real_amount: number;
  order_snapshot: Json;
}

export interface Tables {
  events: EventRow;
  event_options: EventOptionRow;
  profiles: ProfileRow;
  positions: PositionRow;
  trades: TradeRow;
  position_funding_ledger: FundingLedgerRow;
  binary_order_reservations: OrderReservationRow;
}

export type TableName = keyof Tables;

/** `events` joined with its options, as the event catalog query returns it. */
export type EventWithOptions = EventRow & { options: EventOptionRow[] };

export interface ProcessBinaryTradeArgs {
  p_mode: string;
  p_order_id?: string | null;
  p_event_name?: string | null;
  p_option_label?: string | null;
  p_option_id?: string | null;
  p_side?: string | null;
  p_order_type?: string | null;
  p_price?: number | null;
  p_amount?: number | null;
  p_quantity?: number | null;
  p_leverage?: number | null;
  p_tp_value?: number | null;
  p_tp_mode?: string | null;
  p_sl_value?: number | null;
  p_sl_mode?: string | null;
}

export type TradeIntentResult = "open" | "add" | "reduce" | "close";

/** `process_binary_trade` result for a binary market; `null` for any other market. */
export interface ProcessBinaryTradeResult {
  handled: true;
  trade: TradeRow;
  position?: PositionRow | null;
  intent?: TradeIntentResult;
  balanceDelta?: number;
  balanceHandled?: true;
}

export interface AccrueFundingResult {
  success: boolean;
  processed: number;
}

export interface PostgrestError {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

export type QueryResult<T> = { data: T; error: null } | { data: null; error: PostgrestError };

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

/** Supabase Realtime `postgres_changes` payload. */
export interface PostgresChangesPayload<T> {
  schema: "public";
  table: string;
  commit_timestamp: string;
  eventType: RealtimeEvent;
  new: T | Record<string, never>;
  old: Partial<T>;
  errors: null;
}
