import { describe, expect, it } from "vitest";
import {
  accrueFunding,
  FUNDING_INTERVAL_MS,
  fundingPerHour,
  hoursBetween,
  nextAccrualAt,
  randomFundingRate,
} from "./index";

describe("funding accrual", () => {
  it("charges longs a positive rate on size x mark over the elapsed hours", () => {
    // 0.0001 * (1000 * 0.5) * 2h = 0.1
    expect(accrueFunding({ side: "long", ratePerHour: 0.0001, size: 1000, markPrice: 0.5, hours: 2 })).toBe(0.1);
  });

  it("pays shorts when the rate is positive", () => {
    expect(accrueFunding({ side: "short", ratePerHour: 0.0001, size: 1000, markPrice: 0.5, hours: 2 })).toBe(-0.1);
  });

  it("rounds to 6 decimals and returns 0 when nothing accrues", () => {
    expect(accrueFunding({ side: "long", ratePerHour: 0.00012345, size: 10, markPrice: 0.3, hours: 1 })).toBe(0.00037);
    expect(accrueFunding({ side: "long", ratePerHour: 0, size: 1000, markPrice: 0.5, hours: 2 })).toBe(0);
    expect(accrueFunding({ side: "long", ratePerHour: 0.0001, size: 1000, markPrice: 0.5, hours: 0 })).toBe(0);
    expect(accrueFunding({ side: "long", ratePerHour: 0.0000001, size: 1, markPrice: 0.5, hours: 0.01 })).toBe(0);
  });

  it("measures elapsed hours between timestamps", () => {
    expect(hoursBetween("2026-09-24T00:00:00Z", new Date("2026-09-24T01:30:00Z"))).toBe(1.5);
  });
});

describe("funding display", () => {
  it("shows per-hour funding and who pays it", () => {
    expect(fundingPerHour({ side: "long", ratePerHour: 0.0002, notional: 500 })).toEqual({ amount: 0.1, userPays: true });
    expect(fundingPerHour({ side: "short", ratePerHour: 0.0002, notional: 500 })).toEqual({ amount: -0.1, userPays: false });
  });
});

describe("funding rate generation", () => {
  it("stays within +/-0.0002 per hour at 6 decimals", () => {
    expect(randomFundingRate(() => 0)).toBe(-0.0002);
    expect(randomFundingRate(() => 1)).toBe(0.0002);
    expect(randomFundingRate(() => 0.5)).toBe(0);
  });
});

describe("next accrual", () => {
  it("uses the scheduled time when the server gives one", () => {
    expect(nextAccrualAt("2026-09-24T10:00:00Z", "2026-09-24T09:00:00Z")).toBe(Date.parse("2026-09-24T10:00:00Z"));
  });

  it("otherwise expects the next refresh one interval after the last", () => {
    expect(FUNDING_INTERVAL_MS).toBe(5 * 60_000);
    expect(nextAccrualAt(null, "2026-09-24T09:00:00Z")).toBe(Date.parse("2026-09-24T09:05:00Z"));
  });

  it("is unknown when neither time exists", () => {
    expect(nextAccrualAt(null, null)).toBeNull();
  });
});
