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
import { DomainError, mirrorPrice, orderCost, round2 } from "@/modules/trading/domain";
import { cancelOrder, closePosition, getPositionDetail, placeOrder } from "@/modules/trading/application";
import { createTradingContainer } from "@/modules/trading/infrastructure/container";

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
  await runUseCaseChecks();
}

/** The same backend, driven through the application use cases (M3). */
async function runUseCaseChecks() {
  console.log("\n=== through the application layer ===");
  const container = createTradingContainer({ latency: noLatency, autoStart: false });
  const { deps, markets, realtime, backend } = container;
  const balance = async () => (await deps.account.getAccount()).balance;
  const livePrices = () => Object.fromEntries(backend.db.rows("event_options").map((row) => [row.id, row.price]));
  let positionPushes = 0;
  let orderPushes = 0;
  const offPositions = realtime.onPositionsChanged(() => positionPushes++);
  const offOrders = realtime.onOrdersChanged(() => orderPushes++);

  step("market listings");
  const listings = await markets.listActiveMarkets();
  assert.equal(listings.length, 7);
  const listing = (id: string) => listings.find((row) => row.market.id === id)!;
  assert.equal(listing("7").market.sideLabels?.yes, "Lakers");
  assert.equal(typeof listing("2").funding["2-3"].ratePerHour, "number");
  console.log("  7 listings with funding and side labels ✓");

  step("multi-outcome: add to the long position");
  let before = await balance();
  const added = await placeOrder(deps, { listing: listing("2"), optionId: "2-3", side: "buy", orderType: "Market", amount: 100, leverage: 10 });
  assert.equal(added.outcome.intent, "add");
  assert.equal(await balance(), round2(before - added.quote.cost.total));
  const pos1 = (await deps.positions.listOpen()).find((row) => row.id === "pos-1")!;
  assert.equal(pos1.size, 3459 + added.quote.preview.quantity);
  console.log(`  +${added.quote.preview.quantity} contracts, cost ${added.quote.cost.total} ✓`);

  step("multi-outcome: a Yes buy reduces the No (short) position at 1 - p");
  before = await balance();
  const pos2 = (await deps.positions.listOpen()).find((row) => row.id === "pos-2")!;
  const reduced = await placeOrder(deps, { listing: listing("4"), optionId: "4-1", side: "buy", orderType: "Market", amount: 10, leverage: 5 });
  assert.equal(reduced.outcome.intent, "reduce");
  assert.equal(reduced.quote.cost.margin, 0);
  const qty = reduced.quote.preview.quantity;
  const closePrice = mirrorPrice(reduced.quote.price);
  const expectedPnl = (closePrice - pos2.entryPrice) * qty - pos2.fundingAccrued * (qty / pos2.size);
  const expectedDelta = round2(pos2.margin * (qty / pos2.size) + expectedPnl - reduced.quote.cost.fee);
  assert.equal(reduced.outcome.balanceDelta, expectedDelta);
  assert.equal(await balance(), round2(before + expectedDelta));
  console.log(`  closed ${qty} at ${closePrice}, delta ${expectedDelta} ✓`);

  step("multi-outcome limit: reserve, then cancel refunds (E-30)");
  before = await balance();
  const limit = await placeOrder(deps, { listing: listing("3"), optionId: "3-1", side: "buy", orderType: "Limit", amount: 10, leverage: 2, limitPrice: 0.1 });
  assert.equal(limit.outcome.status, "Pending");
  assert.equal(await balance(), round2(before - limit.quote.cost.total));
  const pending = (await deps.orders.listPending()).find((row) => row.optionLabel === "0.030 - 0.035")!;
  await cancelOrder(deps, pending.id);
  assert.equal(await balance(), before);
  console.log(`  reserved ${limit.quote.cost.total}, refunded ✓`);

  step("multi-outcome limit fills when the price reaches it");
  await placeOrder(deps, { listing: listing("3"), optionId: "3-1", side: "buy", orderType: "Limit", amount: 10, leverage: 2, limitPrice: 0.12 });
  before = await balance();
  backend.db.update("event_options", (row) => row.id === "3-1", { price: 0.11 });
  backend.simulator.checkLimitOrders();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const filledPosition = (await deps.positions.listOpen()).find((row) => row.optionLabel === "0.030 - 0.035");
  assert.ok(filledPosition, "limit order opened a position");
  assert.equal(filledPosition!.entryPrice, 0.12);
  assert.equal(await balance(), before, "fill charges nothing: funds were reserved");
  console.log(`  filled at 0.12, size ${filledPosition!.size} ✓`);

  step("partial close credits margin and P&L back (FIX-5)");
  before = await balance();
  const closed = await closePosition(deps, { positionId: "pos-1", quantity: 1000, livePrices: livePrices() });
  assert.equal(closed.closedQuantity, 1000);
  assert.equal(closed.fullyClosed, false);
  assert.equal(await balance(), round2(before + closed.balanceDelta));
  console.log(`  closed 1000, delta ${closed.balanceDelta} ✓`);

  step("blocked and unaffordable orders are refused");
  await assert.rejects(
    placeOrder(deps, { listing: listing("6"), optionId: "6-2", side: "buy", orderType: "Market", amount: 1000, leverage: 10 }),
    (error: unknown) => error instanceof DomainError && error.code === "blocked-cross-zero",
  );
  await assert.rejects(
    placeOrder(deps, { listing: listing("2"), optionId: "2-5", side: "buy", orderType: "Market", amount: 1_000_000, leverage: 1 }),
    (error: unknown) => error instanceof DomainError && error.code === "insufficient-balance",
  );
  console.log("  cross-zero and insufficient balance rejected ✓");

  step("position detail");
  const position = (await deps.positions.listOpen()).find((row) => row.id === "pos-1")!;
  const detail = await getPositionDetail(deps, { position, livePrices: livePrices(), funding: listing("2").funding["2-3"] });
  assert.equal(detail.markPrice, livePrices()["2-3"]);
  assert.ok(Array.isArray(detail.history));
  console.log(`  mark ${detail.markPrice}, net P&L ${detail.netPnl.toFixed(2)}, ${detail.history.length} funding entries ✓`);

  step("realtime pushes reach the application feed");
  assert.ok(positionPushes > 0 && orderPushes > 0);
  offPositions();
  offOrders();
  console.log(`  ${positionPushes} position pushes, ${orderPushes} order pushes ✓`);

  console.log("\nuse-case smoke: all checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
