import { describe, expect, it } from "vitest";
import { marketRepository } from "../../infrastructure/repositories";
import { relatedMarkets } from ".";

const ids = (id: string) => relatedMarkets(marketRepository.getById(id)!, marketRepository.list()).map((m) => m.id);

// Values from scripts/sports-visual/ref-goldens.ts (reference getRelatedMarkets).
describe("related events (dev reference §5.8, E-17)", () => {
  it("shares a team, skips itself and bundled stubs, keeps data order", () => {
    expect(ids("wc26-usa-par")).toEqual(["che-psg-2025-ucl"]);
    expect(ids("liv-new")).toEqual(["ars-new", "epl-winner-25-26", "ucl-winner-25-26"]);
  });

  it("caps at six", () => {
    expect(ids("epl-winner-25-26")).toEqual(["mci-ars", "liv-new", "ars-new", "mci-tot-recap", "epl-top-scorer-25-26", "ucl-winner-25-26"]);
  });

  it("a market without teams has no related events", () => {
    const market = { ...marketRepository.getById("wc26-usa-par")!, fixture: undefined, subjectTeam: undefined };
    market.outcomes = market.outcomes.map((o) => ({ ...o, team: undefined }));
    expect(relatedMarkets(market, marketRepository.list())).toEqual([]);
  });
});
