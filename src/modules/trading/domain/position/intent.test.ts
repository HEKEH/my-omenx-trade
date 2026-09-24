import { describe, expect, it } from "vitest";
import { classifyOrderIntent, type PendingOrderSnapshot, type PositionSnapshot } from "./intent";

// Cases ported from the reference project's positionIntent.test.mjs.
const yes: PositionSnapshot = {
  id: "p1",
  eventName: "market-1",
  optionLabel: "Yes",
  side: "long",
  size: 100,
  entryPrice: 0.4,
  margin: 40,
  fundingAccrued: 5,
};

const binaryIntent = (
  positions: PositionSnapshot[],
  optionLabel: "Yes" | "No",
  quantity: number,
  pendingOrders: PendingOrderSnapshot[] = [],
) =>
  classifyOrderIntent({
    positions,
    pendingOrders,
    eventName: "market-1",
    optionLabel,
    side: "buy",
    quantity,
    price: optionLabel === "No" ? 0.45 : 0.55,
    leverage: 1,
    binary: true,
  });

describe("binary netting", () => {
  it("reduces, closes, or rejects the whole excess order", () => {
    const reduce = binaryIntent([yes], "No", 50);
    expect(reduce.kind).toBe("reduce");
    expect(reduce.qAfter).toBe(50);
    expect(reduce.releasedMargin).toBe(20);
    // closes Yes at 1 - 0.45 = 0.55: (0.55 - 0.40) * 50 - 5 * 50 / 100 = 5
    expect(reduce.realizedPnl).toBeCloseTo(5, 9);
    expect(binaryIntent([yes], "No", 100).kind).toBe("close");
    expect(binaryIntent([yes], "No", 200).kind).toBe("blocked-cross-zero");
    expect(binaryIntent([], "No", 200).kind).toBe("open");

    const no = { ...yes, optionLabel: "No" };
    expect(binaryIntent([no], "Yes", 50).kind).toBe("reduce");
    expect(binaryIntent([no], "Yes", 100).kind).toBe("close");
    expect(binaryIntent([no], "Yes", 200).kind).toBe("blocked-cross-zero");
  });

  it("shares the available close quantity with pending opposite orders", () => {
    const pending: PendingOrderSnapshot[] = [
      { eventName: "market-1", optionLabel: "No", side: "buy", quantity: 60, status: "Pending" },
    ];
    expect(binaryIntent([yes], "No", 40, pending).kind).toBe("reduce");
    expect(binaryIntent([yes], "No", 50, pending).kind).toBe("blocked-cross-zero");
    expect(binaryIntent([], "Yes", 1, pending).kind).toBe("blocked-cross-zero");
  });

  it("ignores pending orders that are no longer open", () => {
    const filled: PendingOrderSnapshot[] = [
      { eventName: "market-1", optionLabel: "No", side: "buy", quantity: 60, status: "Filled" },
    ];
    expect(binaryIntent([yes], "No", 50, filled).kind).toBe("reduce");
  });

  it("blocks new orders on airdrop or dual legacy positions", () => {
    expect(binaryIntent([yes, { ...yes, id: "p2", optionLabel: "No" }], "No", 50).kind).toBe("blocked-market");
    expect(binaryIntent([yes, { ...yes, id: "p2", isAirdrop: true }], "No", 50).kind).toBe("blocked-market");
  });

  it("adds to a same-outcome position and charges margin on the increase", () => {
    const add = binaryIntent([yes], "Yes", 20);
    expect(add.kind).toBe("add");
    expect(add.increaseQty).toBe(20);
    expect(add.incrementalMargin).toBeCloseTo(11, 9); // 0.55 * 20 / 1
  });

  it("closes across positions oldest first", () => {
    const older = { ...yes, id: "old", size: 30, margin: 12, fundingAccrued: 0, createdAt: "2026-01-01T00:00:00Z" };
    const newer = { ...yes, id: "new", size: 70, margin: 28, fundingAccrued: 0, entryPrice: 0.5, createdAt: "2026-02-01T00:00:00Z" };
    const intent = binaryIntent([newer, older], "No", 40);
    expect(intent.kind).toBe("reduce");
    // 30 from `old` at entry 0.40, then 10 from `new` at entry 0.50, all closed at 0.55
    expect(intent.releasedMargin).toBeCloseTo(12 + 4, 9);
    expect(intent.realizedPnl).toBeCloseTo(0.15 * 30 + 0.05 * 10, 9);
  });
});

describe("multi-outcome options", () => {
  const short: PositionSnapshot = {
    id: "s1",
    eventName: "BTC",
    optionLabel: "$100,000 - $110,000",
    side: "short",
    size: 100,
    entryPrice: 0.7, // No side of an option quoted at 0.30
    margin: 7,
    fundingAccrued: 0,
  };

  const intent = (side: "buy" | "sell", quantity: number, price: number, positions = [short]) =>
    classifyOrderIntent({
      positions,
      pendingOrders: [],
      eventName: "BTC",
      optionLabel: "$100,000 - $110,000",
      side,
      quantity,
      price,
      leverage: 10,
      binary: false,
    });

  it("opens when there is no position on the option", () => {
    const open = intent("buy", 10, 0.3, []);
    expect(open.kind).toBe("open");
    expect(open.incrementalMargin).toBeCloseTo(0.3, 9);
  });

  it("adds to a same-side position", () => {
    expect(intent("sell", 10, 0.7).kind).toBe("add");
  });

  it("closes a short in its own price space", () => {
    // Option fell to 0.25, so a Yes buy at 0.25 closes the No position at 0.75.
    const reduce = intent("buy", 50, 0.25);
    expect(reduce.kind).toBe("reduce");
    expect(reduce.releasedMargin).toBeCloseTo(3.5, 9);
    expect(reduce.realizedPnl).toBeCloseTo((0.75 - 0.7) * 50, 9);
    expect(intent("buy", 100, 0.25).kind).toBe("close");
  });

  it("rejects an order that would cross zero", () => {
    const blocked = intent("buy", 150, 0.25);
    expect(blocked.kind).toBe("blocked-cross-zero");
    expect(blocked.increaseQty).toBe(50);
  });

  it("does not net positions on a different option", () => {
    const other = { ...short, optionLabel: "Above $150,000" };
    expect(intent("buy", 50, 0.25, [other]).kind).toBe("open");
  });
});
