import { describe, expect, it } from "vitest";
import {
  EPSILON,
  FEE_RATE,
  SERVER_LEVERAGE,
  UI_LEVERAGE,
  clamp,
  clamp01,
  isContractQuantity,
  isValidLeverage,
  isValidPrice,
  mirrorPrice,
  round2,
  round4,
  round6,
  sidePrice,
} from "./index";

describe("rounding", () => {
  it("rounds half away from zero at the requested precision", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(-1.005)).toBe(-1.01);
    expect(round4(0.12345)).toBe(0.1235);
    expect(round6(0.0000125)).toBe(0.000013);
  });

  it("handles values whose string form is in exponent notation", () => {
    expect(round6(5e-10)).toBe(0);
    expect(round6(-5e-10)).toBe(-0);
    expect(round6(1.25e-7)).toBe(0);
    expect(round2(1e21)).toBe(1e21);
  });

  it("does not drift on already-rounded values", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round4(1 - 0.2891)).toBe(0.7109);
  });
});

describe("clamp", () => {
  it("bounds values", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp01(1.33)).toBe(1);
    expect(clamp01(-0.1)).toBe(0);
  });
});

describe("side price", () => {
  it("uses the option price for long and its complement for short", () => {
    expect(sidePrice(0.2891, "long")).toBe(0.2891);
    expect(sidePrice(0.2891, "short")).toBe(0.7109);
  });

  it("mirrors a price into the other side's space", () => {
    expect(mirrorPrice(0.45)).toBe(0.55);
    expect(mirrorPrice(1.2)).toBe(0);
  });

  it("accepts only open-interval probabilities", () => {
    expect(isValidPrice(0.5)).toBe(true);
    expect(isValidPrice(0)).toBe(false);
    expect(isValidPrice(1)).toBe(false);
    expect(isValidPrice(Number.NaN)).toBe(false);
  });
});

describe("leverage", () => {
  it("enforces UI bounds 1-10 and server bounds 1-100 on integers", () => {
    expect(isValidLeverage(10, UI_LEVERAGE)).toBe(true);
    expect(isValidLeverage(11, UI_LEVERAGE)).toBe(false);
    expect(isValidLeverage(100, SERVER_LEVERAGE)).toBe(true);
    expect(isValidLeverage(0, SERVER_LEVERAGE)).toBe(false);
    expect(isValidLeverage(2.5, SERVER_LEVERAGE)).toBe(false);
  });
});

describe("contract quantity", () => {
  it("requires a positive integer", () => {
    expect(isContractQuantity(3)).toBe(true);
    expect(isContractQuantity(0)).toBe(false);
    expect(isContractQuantity(1.5)).toBe(false);
  });
});

describe("constants", () => {
  it("matches the server fee rate and epsilon", () => {
    expect(FEE_RATE).toBe(0.0005);
    expect(EPSILON).toBe(0.000001);
  });
});
