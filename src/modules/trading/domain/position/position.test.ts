import { describe, expect, it } from "vitest";
import {
  averageEntry,
  clampCloseQuantity,
  computeClose,
  estimateTpSlEditPnl,
  liquidationPrice,
  positionDetail,
  quickCloseQuantity,
  returnOnMargin,
  unrealizedPnl,
} from "./index";

describe("liquidation price", () => {
  it("is entry x (1 - 0.9 / leverage), in the position's own price space", () => {
    expect(liquidationPrice(0.4, 10)).toBe(0.364);
    // a short (No side) position at 0.70 liquidates below its own entry too
    expect(liquidationPrice(0.7, 2)).toBe(0.385);
  });

  it("clamps into [0, 1] and rejects bad inputs", () => {
    expect(liquidationPrice(0.4, 0.5)).toBe(0);
    expect(liquidationPrice(0, 10)).toBeNull();
    expect(liquidationPrice(0.4, 0)).toBeNull();
    expect(liquidationPrice(Number.NaN, 10)).toBeNull();
  });
});

describe("unrealized P&L", () => {
  it("is (side mark - entry) x size for both sides", () => {
    expect(unrealizedPnl({ entryPrice: 0.4, markPrice: 0.5, size: 100 })).toBeCloseTo(10, 9);
    // short on an option that fell from 0.30 to 0.25: No mark 0.75 vs entry 0.70
    expect(unrealizedPnl({ entryPrice: 0.7, markPrice: 0.75, size: 100 })).toBeCloseTo(5, 9);
  });

  it("expresses return on margin in percent", () => {
    expect(returnOnMargin(10, 40)).toBe(25);
    expect(returnOnMargin(10, 0)).toBe(0);
  });
});

describe("average entry", () => {
  it("weights by size", () => {
    expect(averageEntry({ size: 100, entryPrice: 0.4 }, { quantity: 100, price: 0.6 })).toBeCloseTo(0.5, 9);
  });
});

describe("close quantity", () => {
  it("clamps to whole contracts between 1 and the position size", () => {
    expect(clampCloseQuantity(0, 100)).toBe(1);
    expect(clampCloseQuantity(40.7, 100)).toBe(40);
    expect(clampCloseQuantity(500, 100)).toBe(100);
    expect(clampCloseQuantity(1, 0.5)).toBe(1);
  });

  it("maps quick ratios to contract counts", () => {
    expect(quickCloseQuantity(99, 25)).toBe(25);
    expect(quickCloseQuantity(99, 100)).toBe(99);
    expect(quickCloseQuantity(2, 25)).toBe(1);
  });
});

describe("close", () => {
  const position = { size: 100, entryPrice: 0.4, margin: 40, fundingAccrued: 5 };

  it("realizes P&L net of the funding share and credits margin minus fee", () => {
    const partial = computeClose({ position, quantity: 50, closePrice: 0.55 });
    expect(partial.quantity).toBe(50);
    expect(partial.releasedMargin).toBeCloseTo(20, 9);
    expect(partial.fundingSlice).toBeCloseTo(2.5, 9);
    expect(partial.realizedPnl).toBeCloseTo(5, 9); // 0.15 * 50 - 2.5
    expect(partial.fee).toBe(0.01); // 0.55 * 50 * 0.0005 = 0.01375
    expect(partial.balanceDelta).toBe(24.99);
    expect(partial.remaining).toEqual({ size: 50, margin: 20, fundingAccrued: 2.5 });
    expect(partial.fullyClosed).toBe(false);
  });

  it("fully closes when the whole size is taken", () => {
    const full = computeClose({ position, quantity: 100, closePrice: 0.3 });
    expect(full.fullyClosed).toBe(true);
    expect(full.realizedPnl).toBeCloseTo(-15, 9); // -0.1 * 100 - 5
    expect(full.remaining.size).toBe(0);
  });
});

describe("TP/SL edit estimate", () => {
  const position = { entryPrice: 0.4, size: 100, margin: 40, leverage: 10 };

  it("scales margin by leverage in percent mode", () => {
    expect(estimateTpSlEditPnl({ position, kind: "tp", mode: "pct", value: 10 })).toBe(40);
    expect(estimateTpSlEditPnl({ position, kind: "sl", mode: "pct", value: 10 })).toBe(-40);
  });

  it("uses the price distance in price mode", () => {
    expect(estimateTpSlEditPnl({ position, kind: "tp", mode: "price", value: 0.5 })).toBe(10);
    expect(estimateTpSlEditPnl({ position, kind: "sl", mode: "price", value: 0.3 })).toBe(-10);
  });

  it("returns null for empty input", () => {
    expect(estimateTpSlEditPnl({ position, kind: "tp", mode: "pct", value: 0 })).toBeNull();
  });
});

describe("position detail", () => {
  it("reports net P&L, notional and fees at the live mark", () => {
    const detail = positionDetail({
      position: { size: 100, entryPrice: 0.4, margin: 40, fundingAccrued: 2 },
      markPrice: 0.5,
    });
    expect(detail.pricePnl).toBeCloseTo(10, 9);
    expect(detail.netPnl).toBeCloseTo(8, 9);
    expect(detail.pnlPercent).toBeCloseTo(20, 9);
    expect(detail.notional).toBeCloseTo(50, 9);
    expect(detail.openFee).toBeCloseTo(0.02, 9);
    expect(detail.estCloseFee).toBeCloseTo(0.025, 9);
  });
});
