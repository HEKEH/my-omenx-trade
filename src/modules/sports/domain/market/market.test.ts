import { describe, expect, it } from "vitest";
import { marketRepository } from "../../infrastructure/repositories";
import {
  cents,
  delta24hCents,
  isBinaryMarket,
  isDrawOutcome,
  marketKindLabel,
  outcomeColor,
  needsSideToggle,
  outcomeAlias,
  outcomeName,
  positionLeagueKey,
  questionLeagueKey,
} from ".";

const market = (id: string) => {
  const found = marketRepository.getById(id);
  if (!found) throw new Error(id);
  return found;
};

describe("market rules (dev reference §5.2, §5.5)", () => {
  it("renders prices as rounded cents", () => {
    expect(cents(0.48)).toBe(48);
    // 0.285 × 100 is 28.499… in floating point, as on the reference.
    expect(cents(0.285)).toBe(28);
    expect(cents(0.005)).toBe(1);
  });

  it("binary = exactly two outcomes; a side toggle from three", () => {
    expect(isBinaryMarket(market("liv-new"))).toBe(true);
    expect(needsSideToggle(market("liv-new"))).toBe(false);
    expect(isBinaryMarket(market("wc26-usa-par"))).toBe(false);
    expect(needsSideToggle(market("wc26-usa-par"))).toBe(true);
  });

  it("names outcomes by team when there is one", () => {
    const [usa, draw] = market("wc26-usa-par").outcomes;
    expect(outcomeName(usa)).toBe("United States");
    expect(outcomeAlias(usa)).toBe("USA");
    expect(outcomeName(draw)).toBe("Draw");
    expect(outcomeAlias(draw)).toBe("Draw");
  });

  it("detects draws by label or the X meta, never on team outcomes", () => {
    const [usa, draw] = market("wc26-usa-par").outcomes;
    expect(isDrawOutcome(draw)).toBe(true);
    expect(isDrawOutcome({ id: "x", label: "Tie", price: 0.2, meta: "X" })).toBe(true);
    expect(isDrawOutcome(usa)).toBe(false);
  });

  it("24h delta in whole cents, 0 when missing", () => {
    const [usa, draw, par] = market("wc26-usa-par").outcomes;
    expect([delta24hCents(usa), delta24hCents(draw), delta24hCents(par)]).toEqual([3, 0, -3]);
    expect(delta24hCents({ id: "x", label: "X", price: 0.5 })).toBe(0);
  });

  it("outcome colours: team hue, then YES / NO / draw, then the palette by index (CombinedPriceChart.tsx:81-99)", () => {
    const [usa, draw] = market("wc26-usa-par").outcomes;
    expect(outcomeColor(usa, 0)).toBe(`oklch(0.72 0.2 ${usa.team!.hue})`);
    expect(outcomeColor(draw, 1)).toBe("oklch(0.85 0.17 85)");
    expect(outcomeColor({ id: "y", label: "Yes", price: 0.5 }, 0)).toBe("oklch(0.78 0.18 155)");
    expect(outcomeColor({ id: "n", label: "no", price: 0.5 }, 1)).toBe("oklch(0.7 0.22 25)");
    expect(outcomeColor({ id: "x", label: "Kane", price: 0.5 }, 2)).toBe("oklch(0.78 0.18 60)");
    expect(outcomeColor({ id: "x", label: "Kane", price: 0.5 }, 9)).toBe("oklch(0.78 0.18 155)");
  });

  it("kind label: explicit kindLabel, else by kind", () => {
    expect(marketKindLabel({ ...market("epl-winner-25-26"), kindLabel: undefined, kind: "league-winner" })).toBe(
      "Tournament winner",
    );
    expect(marketKindLabel({ ...market("wc26-usa-par"), kindLabel: "Group winner" })).toBe("Group winner");
    expect(marketKindLabel({ ...market("wc26-usa-par"), kindLabel: undefined })).toBe("Match");
  });

  it("question heading maps World Cup to its own badge", () => {
    expect(["EPL", "Premier League", "La Liga", "UCL", "Serie A", "MLS", "NBA", "WC", "World Cup 2026", "Bundesliga"].map(questionLeagueKey)).toEqual(
      ["epl", "epl", "laliga", "ucl", "seriea", "mls", "nba", "wc", "wc", "epl"],
    );
  });

  // Values from scripts/sports-visual/ref-goldens.ts (reference leagueKeyFromShort).
  it("positions use the page's mapping, which has no WC or MLS branch (BUG-2)", () => {
    expect(["EPL", "LL", "UCL", "SA", "NBA", "WC", "MLS"].map(positionLeagueKey)).toEqual([
      "epl",
      "laliga",
      "ucl",
      "seriea",
      "nba",
      "epl",
      "epl",
    ]);
  });
});
