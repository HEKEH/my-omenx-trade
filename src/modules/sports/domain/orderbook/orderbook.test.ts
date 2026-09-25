import { describe, expect, it } from "vitest";
import { buildOrderBook } from ".";

// Hand-derived from OrderBook.tsx:30-203 with its default levels.
describe("order book (dev reference §5.5)", () => {
  const book = buildOrderBook({ mark: 48 });

  it("YES side: asks high → low with depth summed from the spread up, bids summed down", () => {
    expect(book.yes.asks.map((r) => [r.price, r.size, r.total])).toEqual([
      [34, 1610, 7180],
      [33, 880, 5570],
      [32, 540, 4690],
      [31, 1980, 4150],
      [30, 720, 2170],
      [29, 1450, 1450],
    ]);
    expect(book.yes.bids.map((r) => [r.price, r.size, r.total])).toEqual([
      [27, 1240, 1240],
      [26, 880, 2120],
      [25, 2030, 4150],
      [24, 410, 4560],
      [23, 615, 5175],
      [22, 1900, 7075],
    ]);
    expect([book.yes.last, book.yes.spread]).toEqual([48, 2]);
  });

  it("NO side mirrors YES: price 100 − p, asks and bids swapped", () => {
    expect(book.no.asks.map((r) => [r.price, r.size, r.total])).toEqual([
      [78, 1900, 7075],
      [77, 615, 5175],
      [76, 410, 4560],
      [75, 2030, 4150],
      [74, 880, 2120],
      [73, 1240, 1240],
    ]);
    expect(book.no.bids.map((r) => [r.price, r.size, r.total])).toEqual([
      [71, 1450, 1450],
      [70, 720, 2170],
      [69, 1980, 4150],
      [68, 540, 4690],
      [67, 880, 5570],
      [66, 1610, 7180],
    ]);
    expect([book.no.last, book.no.spread]).toEqual([52, 2]);
  });

  it("depth bars are relative to the largest level of each half", () => {
    expect(book.yes.asks.map((r) => r.depthPct)).toEqual([
      (1610 / 1980) * 100,
      (880 / 1980) * 100,
      (540 / 1980) * 100,
      100,
      (720 / 1980) * 100,
      (1450 / 1980) * 100,
    ]);
    expect(book.yes.bids[2].depthPct).toBe(100);
  });

  it("the mark only moves Last; the levels are fixed", () => {
    const other = buildOrderBook({ mark: 25 });
    expect(other.yes.asks).toEqual(book.yes.asks);
    expect([other.yes.last, other.no.last]).toEqual([25, 75]);
  });

  it("with no levels the spread falls back to the mark", () => {
    const empty = buildOrderBook({ mark: 30, yesBids: [], yesAsks: [] });
    expect([empty.yes.asks, empty.yes.bids, empty.yes.spread, empty.no.spread]).toEqual([[], [], 0, 0]);
  });
});
