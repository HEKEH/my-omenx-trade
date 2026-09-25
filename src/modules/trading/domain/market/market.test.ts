import { describe, expect, it } from "vitest";
import {
  binaryOutcome,
  directionLabel,
  displayOptionLabel,
  isBinaryMarket,
  parseSideLabels,
  quotePrice,
  tradePrices,
  type Market,
  yesNoOptions,
} from "./index";

const binary: Market = {
  id: "b1",
  name: "Lakers vs Celtics",
  endTime: null,
  options: [
    { id: "b1-1", label: "Yes", price: 0.62 },
    { id: "b1-2", label: " no ", price: 0.38 },
  ],
  sideLabels: { yes: "Lakers", no: "Celtics" },
};

const multi: Market = {
  id: "2",
  name: "Bitcoin price",
  endTime: null,
  options: [
    { id: "2-1", label: "$80,000 - $90,000", price: 0.0823 },
    { id: "2-3", label: "$100,000 - $110,000", price: 0.2891 },
  ],
};

describe("binary market detection", () => {
  it("needs exactly two options labelled yes and no, ignoring case and spaces", () => {
    expect(isBinaryMarket(binary.options)).toBe(true);
    expect(isBinaryMarket(multi.options)).toBe(false);
    expect(isBinaryMarket([{ label: "Yes" }, { label: "Yes" }])).toBe(false);
    expect(isBinaryMarket([{ label: "Yes" }, { label: "No" }, { label: "Maybe" }])).toBe(false);
  });

  it("classifies option labels into outcomes", () => {
    expect(binaryOutcome("YES")).toBe("yes");
    expect(binaryOutcome(" No")).toBe("no");
    expect(binaryOutcome("25bp Cut")).toBeNull();
  });

  it("finds the yes and no options", () => {
    const { yes, no } = yesNoOptions(binary.options);
    expect(yes?.id).toBe("b1-1");
    expect(no?.id).toBe("b1-2");
  });
});

describe("side labels", () => {
  it("parses only objects with string yes/no fields", () => {
    expect(parseSideLabels({ yes: "A", no: "B" })).toEqual({ yes: "A", no: "B" });
    expect(parseSideLabels({ yes: "A" })).toBeUndefined();
    expect(parseSideLabels(["A", "B"])).toBeUndefined();
    expect(parseSideLabels(null)).toBeUndefined();
  });

  it("shows aliases for binary options and raw labels otherwise", () => {
    expect(displayOptionLabel("Yes", binary)).toBe("Lakers");
    expect(displayOptionLabel("no", binary)).toBe("Celtics");
    expect(displayOptionLabel("$80,000 - $90,000", multi)).toBe("$80,000 - $90,000");
    expect(displayOptionLabel("Yes", { ...binary, sideLabels: undefined })).toBe("Yes");
  });

  it("names a direction Yes/No, or by alias when given", () => {
    expect(directionLabel("long")).toBe("Yes");
    expect(directionLabel("short")).toBe("No");
    expect(directionLabel("short", binary.sideLabels)).toBe("Celtics");
  });
});

describe("trade prices", () => {
  it("uses each binary option's own price", () => {
    expect(tradePrices(binary, "b1-2")).toEqual({ yes: 0.62, no: 0.38 });
  });

  it("uses p and 1 - p for a multi-outcome option", () => {
    expect(tradePrices(multi, "2-3")).toEqual({ yes: 0.2891, no: 0.7109 });
  });

  it("falls back to the first option when the selection is unknown", () => {
    expect(tradePrices(multi, "missing")).toEqual({ yes: 0.0823, no: 0.9177 });
  });
});

describe("quote price", () => {
  const multi = { id: "1", name: "m", options: [{ id: "a", label: "A", price: 0.3 }, { id: "b", label: "B", price: 0.7 }] };
  const binary = { id: "2", name: "b", options: [{ id: "y", label: "Yes", price: 0.62 }, { id: "n", label: "No", price: 0.38 }] };

  it("quotes a multi-outcome option at p for Yes and 1 - p for No", () => {
    expect(quotePrice(multi, 0.3, "buy")).toBe(0.3);
    expect(quotePrice(multi, 0.3, "sell")).toBe(0.7);
  });

  it("quotes a binary market's selected option at its own price on either side", () => {
    expect(quotePrice(binary, 0.38, "buy")).toBe(0.38);
    expect(quotePrice(binary, 0.38, "sell")).toBe(0.38);
  });
});
