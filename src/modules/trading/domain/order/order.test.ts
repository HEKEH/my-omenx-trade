import { describe, expect, it } from "vitest";
import {
  amountForQuantity,
  computeOrderPreview,
  estimateTpSlPnl,
  orderCost,
  quantityForAmount,
  resolveTpSlPrice,
  validateOrder,
} from "./index";

describe("quantity", () => {
  it("is amount x leverage / price, rounded to whole contracts", () => {
    // 100 * 10 / 0.2891 = 3459.01...
    expect(quantityForAmount(100, 10, 0.2891)).toBe(3459);
    // 10 * 1 / 0.4 = 25 exactly
    expect(quantityForAmount(10, 1, 0.4)).toBe(25);
    // 1.25 rounds half up
    expect(quantityForAmount(0.5, 1, 0.4)).toBe(1);
    expect(quantityForAmount(100, 10, 0)).toBe(0);
  });

  it("converts back to the margin-sized amount", () => {
    expect(amountForQuantity(3459, 10, 0.2891)).toBe(100);
  });
});

describe("order cost (server rules)", () => {
  it("charges fee and margin on price x quantity", () => {
    // 0.2891 * 3459 = 999.9969
    expect(orderCost({ price: 0.2891, quantity: 3459, leverage: 10, reducing: false })).toEqual({
      notional: 1000,
      margin: 100,
      fee: 0.5,
      total: 100.5,
    });
  });

  it("needs no margin when the order reduces a position", () => {
    expect(orderCost({ price: 0.45, quantity: 50, leverage: 10, reducing: true })).toEqual({
      notional: 22.5,
      margin: 0,
      fee: 0.01,
      total: 0.01,
    });
  });
});

describe("order preview", () => {
  it("derives quantity, cost and potential win from the amount", () => {
    const preview = computeOrderPreview({ amount: 100, leverage: 10, price: 0.2891 });
    expect(preview.quantity).toBe(3459);
    expect(preview.cost).toEqual({ notional: 1000, margin: 100, fee: 0.5, total: 100.5 });
    // (1 - 0.2891) * 3459 = 2459.0031
    expect(preview.potentialWin).toBe(2459);
  });

  it("uses the rounded contract count, not amount x leverage, for fee and margin", () => {
    // 1 * 10 / 0.7 = 14.29 -> 14 contracts; 0.7 * 14 = 9.8 notional.
    // The reference client would charge fee on 1 * 10 = 10 and margin = amount.
    const preview = computeOrderPreview({ amount: 1, leverage: 10, price: 0.7 });
    expect(preview.quantity).toBe(14);
    expect(preview.cost).toEqual({ notional: 9.8, margin: 0.98, fee: 0, total: 0.98 });
  });

  it("prices a limit order at the limit price the caller passes in", () => {
    const market = computeOrderPreview({ amount: 100, leverage: 10, price: 0.2891 });
    const limit = computeOrderPreview({ amount: 100, leverage: 10, price: 0.25 });
    expect(limit.quantity).toBe(4000);
    expect(limit.quantity).not.toBe(market.quantity);
  });

  it("is empty for a zero amount", () => {
    const preview = computeOrderPreview({ amount: 0, leverage: 10, price: 0.3 });
    expect(preview.quantity).toBe(0);
    expect(preview.cost.total).toBe(0);
    expect(preview.potentialWin).toBe(0);
  });
});

describe("TP/SL", () => {
  it("offsets from the entry price in the position's own price space", () => {
    expect(resolveTpSlPrice({ kind: "tp", mode: "pct", value: 20, basePrice: 0.5 })).toBe(0.6);
    expect(resolveTpSlPrice({ kind: "sl", mode: "pct", value: 10, basePrice: 0.5 })).toBe(0.45);
    expect(resolveTpSlPrice({ kind: "tp", mode: "price", value: 0.71, basePrice: 0.5 })).toBe(0.71);
  });

  it("clamps targets into the price range", () => {
    expect(resolveTpSlPrice({ kind: "tp", mode: "pct", value: 150, basePrice: 0.5 })).toBe(1);
  });

  it("estimates the P&L at the target", () => {
    expect(estimateTpSlPnl({ target: 0.6, basePrice: 0.5, quantity: 200 })).toBe(20);
    expect(estimateTpSlPnl({ target: 0.45, basePrice: 0.5, quantity: 200 })).toBe(-10);
  });
});

describe("order validation", () => {
  const valid = {
    price: 0.3,
    amount: 100,
    quantity: 3333,
    leverage: 10,
    orderType: "Market" as const,
    total: 100.5,
    availableBalance: 1000,
  };

  it("accepts a well-formed order", () => {
    expect(validateOrder(valid)).toEqual([]);
  });

  it("reports every broken rule", () => {
    expect(validateOrder({ ...valid, price: 1 })).toContain("invalid-price");
    expect(validateOrder({ ...valid, amount: 0 })).toContain("invalid-amount");
    expect(validateOrder({ ...valid, quantity: 1.5 })).toContain("invalid-quantity");
    expect(validateOrder({ ...valid, leverage: 11 })).toContain("invalid-leverage");
    expect(validateOrder({ ...valid, availableBalance: 50 })).toContain("insufficient-balance");
  });
});
