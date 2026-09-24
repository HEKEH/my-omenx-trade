import { applyBalanceDelta } from "../../domain";
import type {
  AccountRepository,
  AccountView,
  FundingLedgerEntry,
  MarketListing,
  MarketRepository,
  OrderRepository,
  OrderView,
  PositionRepository,
  PositionView,
  TpSlSetting,
} from "../../application";
import type { MockSupabaseClient } from "../mock-server";
import { toMarket, toPendingOrderSnapshot, toPositionSnapshot } from "../supabase-shape/mappers";
import type { EventOptionRow, EventRow, PositionRow, QueryResult, TradeRow } from "../supabase-shape/rows";

/** The client the repositories talk to: the mock today, supabase-js tomorrow. */
export type BackendClient = MockSupabaseClient;

export class BackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendError";
  }
}

/** Unwraps a `{ data, error }` result, throwing on error. */
export const unwrap = <T>(result: QueryResult<T>): T => {
  if (result.error) throw new BackendError(result.error.message);
  return result.data;
};

const toTpSl = (value: number | null, mode: string | null): TpSlSetting | null =>
  value === null ? null : { value, mode: mode === "%" ? "%" : "$" };

const toListing = (event: EventRow, options: EventOptionRow[]): MarketListing => ({
  market: toMarket({ ...event, options }),
  icon: event.icon,
  category: event.category,
  volume: event.volume,
  priceLabel: event.price_label,
  description: event.description,
  rules: event.rules ? event.rules.split("\n") : [],
  sourceName: event.source_name,
  sourceUrl: event.source_url,
  settlement: event.settlement_description,
  funding: Object.fromEntries(
    options.map((option) => [option.id, { ratePerHour: option.funding_rate, nextFundingAt: option.next_funding_at }]),
  ),
});

export class SupabaseMarketRepository implements MarketRepository {
  constructor(private readonly client: BackendClient) {}

  /** Same two queries as the reference `useActiveEvents`. */
  async listActiveMarkets(): Promise<MarketListing[]> {
    const events = unwrap(
      await this.client.from("events").select("*").eq("is_resolved", false).order("end_date", { ascending: true }),
    );
    if (events.length === 0) return [];
    const options = unwrap(
      await this.client
        .from("event_options")
        .select("*")
        .in(
          "event_id",
          events.map((event) => event.id),
        )
        .order("id"),
    );
    return events.map((event) =>
      toListing(
        event,
        options.filter((option) => option.event_id === event.id),
      ),
    );
  }
}

export class SupabaseAccountRepository implements AccountRepository {
  constructor(
    private readonly client: BackendClient,
    private readonly userId: string,
  ) {}

  async getAccount(): Promise<AccountView> {
    const profile = unwrap(await this.client.from("profiles").select("*").eq("user_id", this.userId).maybeSingle());
    return { userId: this.userId, balance: profile?.balance ?? 0 };
  }

  /** Client-side balance write, used for non-binary trades (binary trades settle in the RPC). */
  async applyBalanceDelta(delta: number): Promise<AccountView> {
    const { balance } = await this.getAccount();
    const next = applyBalanceDelta(balance, delta);
    unwrap(await this.client.from("profiles").update({ balance: next }).eq("user_id", this.userId));
    return { userId: this.userId, balance: next };
  }
}

export const toPositionView = (row: PositionRow): PositionView => ({
  ...toPositionSnapshot(row),
  optionId: row.option_id,
  leverage: Number(row.leverage),
  tp: toTpSl(row.tp_value, row.tp_mode),
  sl: toTpSl(row.sl_value, row.sl_mode),
  lastFundingAt: row.last_funding_at,
});

export class SupabasePositionRepository implements PositionRepository {
  constructor(
    private readonly client: BackendClient,
    private readonly userId: string,
  ) {}

  async listOpen(): Promise<PositionView[]> {
    const rows = unwrap(
      await this.client
        .from("positions")
        .select("*")
        .eq("user_id", this.userId)
        .eq("status", "Open")
        .order("created_at", { ascending: false }),
    );
    return rows.map(toPositionView);
  }

  async fundingHistory(positionId: string): Promise<FundingLedgerEntry[]> {
    const rows = unwrap(
      await this.client
        .from("position_funding_ledger")
        .select("id, applied_rate, notional, amount, accrual_start, accrual_end, created_at")
        .eq("position_id", positionId)
        .neq("amount", 0)
        .order("created_at", { ascending: false })
        .limit(200),
    );
    return rows.map((row) => ({
      id: row.id,
      appliedRate: row.applied_rate,
      notional: row.notional,
      amount: row.amount,
      accrualStart: row.accrual_start,
      accrualEnd: row.accrual_end,
      createdAt: row.created_at,
    }));
  }

  async updateTpSl(positionId: string, tp: TpSlSetting | null, sl: TpSlSetting | null) {
    unwrap(
      await this.client
        .from("positions")
        .update({
          tp_value: tp?.value ?? null,
          tp_mode: tp?.mode ?? null,
          sl_value: sl?.value ?? null,
          sl_mode: sl?.mode ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", positionId)
        .eq("user_id", this.userId),
    );
  }
}

export const toOrderView = (row: TradeRow): OrderView => ({
  ...toPendingOrderSnapshot(row),
  id: row.id,
  orderType: row.order_type === "Limit" ? "Limit" : "Market",
  price: Number(row.price),
  amount: Number(row.amount),
  createdAt: row.created_at,
});

export class SupabaseOrderRepository implements OrderRepository {
  constructor(
    private readonly client: BackendClient,
    private readonly userId: string,
  ) {}

  async listPending(): Promise<OrderView[]> {
    const rows = unwrap(
      await this.client
        .from("trades")
        .select("*")
        .eq("user_id", this.userId)
        .in("status", ["Pending", "Partial Filled"])
        .order("created_at", { ascending: false }),
    );
    return rows.map(toOrderView);
  }
}
