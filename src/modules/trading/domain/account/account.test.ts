import { describe, expect, it } from "vitest";
import { DomainError } from "../shared";
import { applyBalanceDelta, computeAccountRisk, riskLevelFor } from "./index";

describe("balance", () => {
  it("debits and credits the real balance only", () => {
    expect(applyBalanceDelta(1000, -100.5)).toBe(899.5);
    expect(applyBalanceDelta(1000, 24.99)).toBe(1024.99);
  });

  it("refuses to go below zero", () => {
    expect(() => applyBalanceDelta(50, -100.5)).toThrow(DomainError);
  });
});

describe("risk level", () => {
  it("steps at 80, 95 and 100 percent", () => {
    expect(riskLevelFor(79.99)).toBe("SAFE");
    expect(riskLevelFor(80)).toBe("WARNING");
    expect(riskLevelFor(94.99)).toBe("WARNING");
    expect(riskLevelFor(95)).toBe("RESTRICTION");
    expect(riskLevelFor(100)).toBe("LIQUIDATION");
  });
});

describe("account risk", () => {
  it("measures initial margin against equity", () => {
    const risk = computeAccountRisk({
      balance: 1000,
      positions: [
        { margin: 300, unrealizedPnl: 50 },
        { margin: 200, unrealizedPnl: -50 },
      ],
    });
    expect(risk.equity).toBe(1000);
    expect(risk.initialMargin).toBe(500);
    expect(risk.maintenanceMargin).toBe(250);
    expect(risk.riskRatio).toBe(50);
    expect(risk.maintenanceRate).toBe(25);
    expect(risk.level).toBe("SAFE");
    expect(risk.availableMargin).toBe(500);
  });

  it("levels before clamping the displayed ratio to 150", () => {
    const risk = computeAccountRisk({ balance: 100, positions: [{ margin: 400, unrealizedPnl: 0 }] });
    expect(risk.level).toBe("LIQUIDATION");
    expect(risk.riskRatio).toBe(150);
    expect(risk.availableMargin).toBe(0);
  });

  it("reports zero ratios when equity is not positive", () => {
    const risk = computeAccountRisk({ balance: 0, positions: [{ margin: 10, unrealizedPnl: -5 }] });
    expect(risk.riskRatio).toBe(0);
    expect(risk.level).toBe("SAFE");
  });
});
