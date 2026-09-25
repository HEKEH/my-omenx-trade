import { describe, expect, it } from "vitest";
import { marketRepository } from "../../infrastructure/repositories";
import { ageTape, formatAgo, injectFill, nextFill, seededRandom, seedTape, TAPE_ROWS, type Fill } from ".";

const market = (id: string) => marketRepository.getById(id)!;

// Values from scripts/sports-visual/ref-goldens.ts (reference LiveTape seed rows).
describe("live tape seed (dev reference §5.6)", () => {
  it("wc26-usa-par: eight rows from the market id", () => {
    expect(TAPE_ROWS).toBe(8);
    expect(seedTape(market("wc26-usa-par"))).toEqual([
      { id: "seed-0", user: "0x73c…1ee", outcomeIdx: 0, outcomeLabel: "United States", side: "sell", price: 47, size: 353, agoSec: 8 },
      { id: "seed-1", user: "shark_99", outcomeIdx: 0, outcomeLabel: "United States", side: "sell", price: 50, size: 41, agoSec: 13 },
      { id: "seed-2", user: "luna.eth", outcomeIdx: 2, outcomeLabel: "Paraguay", side: "sell", price: 27, size: 311, agoSec: 16 },
      { id: "seed-3", user: "wager_kid", outcomeIdx: 1, outcomeLabel: "Draw", side: "sell", price: 30, size: 364, agoSec: 29 },
      { id: "seed-4", user: "0x73c…1ee", outcomeIdx: 1, outcomeLabel: "Draw", side: "sell", price: 31, size: 359, agoSec: 36 },
      { id: "seed-5", user: "stoxx", outcomeIdx: 0, outcomeLabel: "United States", side: "sell", price: 48, size: 456, agoSec: 42 },
      { id: "seed-6", user: "shark_99", outcomeIdx: 2, outcomeLabel: "Paraguay", side: "sell", price: 23, size: 335, agoSec: 40 },
      { id: "seed-7", user: "midfield_m", outcomeIdx: 2, outcomeLabel: "Paraguay", side: "buy", price: 27, size: 157, agoSec: 50 },
    ]);
  });

  it("binary market", () => {
    expect(seedTape(market("liv-new")).slice(0, 3)).toEqual([
      { id: "seed-0", user: "stoxx", outcomeIdx: 0, outcomeLabel: "Liverpool", side: "sell", price: 61, size: 469, agoSec: 11 },
      { id: "seed-1", user: "stoxx", outcomeIdx: 1, outcomeLabel: "Newcastle", side: "buy", price: 35, size: 76, agoSec: 17 },
      { id: "seed-2", user: "midfield_m", outcomeIdx: 1, outcomeLabel: "Newcastle", side: "sell", price: 36, size: 478, agoSec: 19 },
    ]);
  });

  it("injected fills draw in the same order and start at 1s", () => {
    const live = market("wc26-usa-par");
    const fill = nextFill(seededRandom(123), live, "live-1")!;
    const r = seededRandom(123);
    const outcomeIdx = Math.floor(r() * 3);
    r(); // price jitter
    expect(fill).toMatchObject({ id: "live-1", outcomeIdx, agoSec: 1 });
    expect(fill.price).toBeGreaterThanOrEqual(1);
    expect(fill.size).toBeGreaterThanOrEqual(10);
  });

  it("a negative seed (Date.now() | 0 today) draws an outcome index of −1: no fill, one draw used (BUG-11)", () => {
    const r = seededRandom(-649759879);
    expect(nextFill(r, market("wc26-usa-par"), "live-1")).toBeNull();
    // Only the outcome draw was consumed.
    const fresh = seededRandom(-649759879);
    fresh();
    expect(r()).toBe(fresh());
  });

  it("each second every fill ages by one; injected fills go on top and the list keeps its length", () => {
    const fills = seedTape(market("wc26-usa-par"));
    expect(ageTape(fills).map((f) => f.agoSec)).toEqual(fills.map((f) => f.agoSec + 1));
    const fresh: Fill = { ...fills[0], id: "live-9", agoSec: 1 };
    const next = injectFill(fills, fresh);
    expect(next).toHaveLength(TAPE_ROWS);
    expect(next[0]).toBe(fresh);
    expect(next.at(-1)).toBe(fills[6]);
  });

  it("ages read as s / m / h, at least 1s", () => {
    expect([0, 1, 59, 60, 3599, 3600, 7300].map(formatAgo)).toEqual(["1s", "1s", "59s", "1m", "59m", "1h", "2h"]);
  });
});
