import { describe, expect, it } from "vitest";
import baseline from "./__fixtures__/ref-markets.json";
import { marketRepository } from "./repositories";

// Same normalisation as scripts/sports-visual/dump-ref-markets.ts: local images become bare
// file names, external URLs stay as they are.
const localAsset = /^(?!https?:).*[\\/]([^\\/]+\.(?:png|jpe?g|svg|webp))$/i;
const normalise = (value: unknown) =>
  JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === "string" && localAsset.test(v) ? v.replace(localAsset, "$1") : v)),
  );

describe("ported market data (dev reference E-21)", () => {
  it("equals the reference's ALL_MARKETS field by field, in the same order", () => {
    expect(normalise(marketRepository.list())).toEqual(baseline);
  });

  it("has 137 markets with unique ids", () => {
    const ids = marketRepository.list().map((market) => market.id);
    expect(ids).toHaveLength(137);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("finds wc26-usa-par as a live three-way match", () => {
    const market = marketRepository.getById("wc26-usa-par");
    expect(market?.title).toBe("United States vs Paraguay");
    expect(market?.isLiveStream).toBe(true);
    expect(market?.outcomes.map((o) => [o.id, o.price])).toEqual([
      ["h", 0.48],
      ["d", 0.29],
      ["a", 0.25],
    ]);
    expect(marketRepository.getById("nope")).toBeUndefined();
  });
});
