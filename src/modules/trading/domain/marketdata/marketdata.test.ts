import { describe, expect, it } from "vitest";
import {
  aggregateOrderBook,
  depthPercent,
  mirrorOrderBook,
  priceChangePercent,
  stepDecimals,
  withCumulativeTotals,
} from "./index";

describe("price step", () => {
  it("shows as many decimals as the step has", () => {
    expect(stepDecimals(0.0001)).toBe(4);
    expect(stepDecimals(0.01)).toBe(2);
    expect(stepDecimals(1)).toBe(0);
  });
});

describe("cumulative totals", () => {
  it("accumulates amounts from the top of the book", () => {
    expect(withCumulativeTotals([{ price: 0.3, amount: 100 }, { price: 0.29, amount: 50 }])).toEqual([
      { price: 0.3, amount: 100, total: 100 },
      { price: 0.29, amount: 50, total: 150 },
    ]);
  });
});

describe("order book aggregation", () => {
  const bids = [
    { price: 0.2995, amount: 100 },
    { price: 0.2991, amount: 50 },
    { price: 0.2985, amount: 20 },
  ];
  const asks = [
    { price: 0.3001, amount: 10 },
    { price: 0.3009, amount: 30 },
    { price: 0.3015, amount: 5 },
  ];

  it("rounds bids down into buckets, best first", () => {
    expect(aggregateOrderBook(bids, 0.001, "bid")).toEqual([
      { price: 0.299, amount: 150, total: 150 },
      { price: 0.298, amount: 20, total: 170 },
    ]);
  });

  it("rounds asks up into buckets, best first", () => {
    expect(aggregateOrderBook(asks, 0.001, "ask")).toEqual([
      { price: 0.301, amount: 40, total: 40 },
      { price: 0.302, amount: 5, total: 45 },
    ]);
  });

  it("keeps a price that sits exactly on a bucket boundary", () => {
    // 0.3 / 0.0001 is 2999.9999999999995 in floating point
    expect(aggregateOrderBook([{ price: 0.3, amount: 1 }], 0.0001, "bid")[0].price).toBe(0.3);
    expect(aggregateOrderBook([{ price: 0.3, amount: 1 }], 0.0001, "ask")[0].price).toBe(0.3);
    // 0.07 / 0.01 is 7.000000000000001 in floating point
    expect(aggregateOrderBook([{ price: 0.07, amount: 1 }], 0.01, "ask")[0].price).toBe(0.07);
  });
});

describe("order book mirroring", () => {
  it("shows the No side as 1 - p with asks and bids swapped", () => {
    const mirrored = mirrorOrderBook({
      asks: [{ price: 0.3005, amount: 10 }],
      bids: [{ price: 0.2995, amount: 20 }],
    });
    expect(mirrored).toEqual({
      asks: [{ price: 0.7005, amount: 20 }],
      bids: [{ price: 0.6995, amount: 10 }],
    });
  });
});

describe("depth and change", () => {
  it("sizes depth bars against the deepest level", () => {
    expect(depthPercent(50, 200)).toBe(25);
    expect(depthPercent(10, 0)).toBe(0);
  });

  it("measures change against a base price", () => {
    expect(priceChangePercent(0.303, 0.3)).toBe(1);
    expect(priceChangePercent(0.297, 0.3)).toBe(-1);
    expect(priceChangePercent(0.3, 0)).toBe(0);
  });
});
