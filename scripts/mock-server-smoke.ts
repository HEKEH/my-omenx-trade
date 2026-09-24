/**
 * End-to-end check of the mock backend: queries, the binary trade RPC,
 * funding, realtime payloads and row shapes. Exits non-zero on the first
 * mismatch.
 *
 *   pnpm dlx tsx scripts/mock-server-smoke.ts
 */
import assert from "node:assert/strict";
import { createControls } from "@/modules/trading/infrastructure/mock-server/devtools";
import { createMockBackend, MOCK_USER_ID, noLatency } from "@/modules/trading/infrastructure/mock-server";
import type { PostgresChangesPayload, PositionRow, TradeRow } from "@/modules/trading/infrastructure/supabase-shape/rows";
import { orderCost, round2 } from "@/modules/trading/domain";

// Field sets of the reference project's Supabase rows (src/integrations/supabase/types.ts).
const REFERENCE_KEYS = {
  events: "category created_at description end_date external_links icon id is_resolved name price_label rules settled_at settlement_description side_labels source_name source_url start_date updated_at volume winning_option_id",
  event_options: "created_at event_id final_price funding_rate id is_winner label next_funding_at price updated_at",
  profiles: "auth_method avatar_url balance created_at email id totp_enabled trial_balance updated_at user_id username withdraw_2fa_mode",
  positions: "closed_at created_at entry_price event_name funding_accrued id last_funding_at leverage margin mark_price option_id option_label pnl pnl_percent side size sl_mode sl_value status tp_mode tp_value trade_id updated_at user_id",
  trades: "amount closed_at created_at event_name fee funding_paid id leverage margin option_label order_type pnl price quantity side sl_mode sl_value status tp_mode tp_value updated_at user_id",
  position_funding_ledger: "accrual_end accrual_start amount applied_rate created_at event_name id notional option_id position_id user_id",
} as const;

const keysOf = (row: object) => Object.keys(row).sort().join(" ");
const step = (name: string) => console.log(`\n▶ ${name}`);

async function main() {
  const backend = createMockBackend({ latency: noLatency });
  const { client, db } = backend;
  const balance = () => db.find("profiles", (row) => row.user_id === MOCK_USER_ID)!.balance!;

  // Realtime: collect every payload on the three channels the page subscribes to.
  const payloads: PostgresChangesPayload<unknown>[] = [];
  client
    .channel("global-event-options-prices")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "event_options" }, (p) => payloads.push(p))
    .subscribe();
  client
    .channel(`positions-${MOCK_USER_ID}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "positions", filter: `user_id=eq.${MOCK_USER_ID}` }, (p) => payloads.push(p))
    .subscribe();
  client
    .channel("pending-orders-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${MOCK_USER_ID}` }, (p) => payloads.push(p))
    .subscribe();

  step("row shapes match the reference schema");
  for (const [table, expected] of Object.entries(REFERENCE_KEYS)) {
    const rows = db.rows(table as keyof typeof REFERENCE_KEYS);
    if (rows.length === 0) continue;
    assert.equal(keysOf(rows[0]), expected.split(" ").sort().join(" "), `${table} fields`);
    console.log(`  ${table}: ${rows.length} rows ✓`);
  }

  step("event catalog query");
  const { data: events, error } = await client.from("events").select("*").eq("is_resolved", false).order("end_date", { ascending: true });
  assert.equal(error, null);
  assert.equal(events!.length, 7);
  const ids = events!.map((event) => event.id);
  const { data: options } = await client.from("event_options").select("*").in("event_id", ids).order("id");
  assert.equal(options!.length, 33);
  console.log(`  ${events!.length} events, ${options!.length} options ✓`);

  const binaryEvent = events!.find((event) => event.id === "6")!;

  step("binary: add to the Yes position (market)");
  let before = balance();
  const add = await client.rpc("process_binary_trade", {
    p_mode: "place", p_event_name: binaryEvent.name, p_option_label: "Yes", p_option_id: "6-1",
    p_side: "buy", p_order_type: "Market", p_price: 0.62, p_amount: 31, p_quantity: 100, p_leverage: 2,
  });
  assert.equal(add.error, null, add.error?.message);
  assert.equal(add.data!.intent, "add");
  const addCost = orderCost({ price: 0.62, quantity: 100, leverage: 2, reducing: false });
  assert.equal(add.data!.balanceDelta, -addCost.total);
  assert.equal(balance(), round2(before - addCost.total));
  const merged = add.data!.position as PositionRow;
  assert.equal(merged.size, 300);
  assert.ok(Math.abs(merged.entry_price - (200 * 0.55 + 100 * 0.62) / 300) < 1e-12);
  console.log(`  intent add, size 300 @ ${merged.entry_price.toFixed(4)}, balance ${before} → ${balance()} ✓`);

  step("binary: buying No reduces Yes at 1 - p");
  before = balance();
  const reduce = await client.rpc("process_binary_trade", {
    p_mode: "place", p_event_name: binaryEvent.name, p_option_label: "No", p_option_id: "6-2",
    p_side: "buy", p_order_type: "Market", p_price: 0.38, p_amount: 9.5, p_quantity: 50, p_leverage: 2,
  });
  assert.equal(reduce.error, null, reduce.error?.message);
  assert.equal(reduce.data!.intent, "reduce");
  const reduceTrade = reduce.data!.trade;
  assert.equal(reduceTrade.margin, 0);
  const released = merged.margin * (50 / 300);
  const pnl = (0.62 - merged.entry_price) * 50;
  assert.ok(Math.abs(reduce.data!.balanceDelta! - Math.round((released + pnl - reduceTrade.fee) * 100) / 100) < 1e-9);
  console.log(`  intent reduce, delta ${reduce.data!.balanceDelta}, balance ${before} → ${balance()} ✓`);

  step("binary: an order larger than the opposite position is rejected");
  const excess = await client.rpc("process_binary_trade", {
    p_mode: "place", p_event_name: binaryEvent.name, p_option_label: "No", p_side: "buy",
    p_order_type: "Market", p_price: 0.38, p_amount: 100, p_quantity: 1000, p_leverage: 2,
  });
  assert.match(excess.error?.message ?? "", /exceeds the opposite position/);
  console.log(`  rejected: ${excess.error!.message} ✓`);

  step("binary: limit order reserves funds, cancel refunds them");
  const lakers = events!.find((event) => event.id === "7")!;
  before = balance();
  const limit = await client.rpc("process_binary_trade", {
    p_mode: "place", p_event_name: lakers.name, p_option_label: "No", p_side: "buy",
    p_order_type: "Limit", p_price: 0.4, p_amount: 20, p_quantity: 150, p_leverage: 3,
  });
  assert.equal(limit.error, null, limit.error?.message);
  const limitTrade = limit.data!.trade;
  assert.equal(limitTrade.status, "Pending");
  const reserved = orderCost({ price: 0.4, quantity: 150, leverage: 3, reducing: false }).total;
  assert.equal(balance(), round2(before - reserved));
  const cancel = await client.rpc("process_binary_trade", { p_mode: "cancel", p_order_id: limitTrade.id });
  assert.equal(cancel.error, null, cancel.error?.message);
  assert.equal(cancel.data!.trade.status, "Cancelled");
  assert.equal(balance(), before);
  console.log(`  reserved ${reserved}, refunded on cancel ✓`);

  step("binary: a Yes order is blocked while a No limit is pending and there is no position");
  const blocked = await client.rpc("process_binary_trade", {
    p_mode: "place", p_event_name: lakers.name, p_option_label: "Yes", p_side: "buy",
    p_order_type: "Market", p_price: 0.46, p_amount: 10, p_quantity: 20, p_leverage: 1,
  });
  assert.match(blocked.error?.message ?? "", /Opposite pending orders/);
  console.log(`  rejected: ${blocked.error!.message} ✓`);

  step("limit order fills when the price reaches it");
  before = balance();
  const controls = createControls(backend);
  controls.setPrice("7-2", 0.49);
  const filled = db.find("trades", (row) => row.id === "order-2") as TradeRow;
  assert.equal(filled.status, "Filled");
  const opened = db.find("positions", (row) => row.trade_id === "order-2")!;
  assert.equal(opened.size, 300);
  assert.equal(opened.entry_price, 0.5);
  assert.equal(balance(), before, "funds were reserved at placement, so the fill charges nothing");
  console.log(`  order-2 filled at 0.50 → position ${opened.id} ✓`);

  step("funding accrual");
  const accrue = await client.functions.invoke("accrue-funding", { body: {} });
  assert.equal(accrue.error, null);
  assert.ok(accrue.data!.processed >= 1);
  const ledger = db.rows("position_funding_ledger");
  assert.equal(ledger.length, accrue.data!.processed);
  assert.equal(keysOf(ledger[0]), REFERENCE_KEYS.position_funding_ledger.split(" ").sort().join(" "));
  console.log(`  ${accrue.data!.processed} positions accrued, ledger rows ✓`);

  step("price walk pushes realtime updates");
  const priceUpdatesBefore = payloads.filter((p) => p.table === "event_options").length;
  backend.simulator.tick();
  const priceUpdates = payloads.filter((p) => p.table === "event_options").length - priceUpdatesBefore;
  assert.equal(priceUpdates, 33);
  const eventSix = db.rows("event_options").filter((row) => row.event_id === "6");
  assert.equal(eventSix[0].price + eventSix[1].price, 1, "binary prices stay complementary");
  const multi = db.rows("event_options").filter((row) => row.event_id === "2");
  assert.ok(Math.abs(multi.reduce((sum, row) => sum + row.price, 0) - 1) < 0.001, "multi-outcome prices sum to ~1");
  console.log(`  ${priceUpdates} UPDATE payloads, binary complementary, multi sums to 1 ✓`);

  step("realtime payload shape");
  const sample = payloads.find((p) => p.table === "positions")!;
  assert.deepEqual(Object.keys(sample).sort(), ["commit_timestamp", "errors", "eventType", "new", "old", "schema", "table"]);
  const tables = new Set(payloads.map((p) => p.table));
  assert.deepEqual([...tables].sort(), ["event_options", "positions", "trades"]);
  console.log(`  ${payloads.length} payloads across ${[...tables].join(", ")} ✓`);

  console.log("\nmock backend smoke: all checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
