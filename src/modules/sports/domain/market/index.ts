import type { Outcome, SportsMarket } from "./types";

export type { MarketKind, Outcome, SportsMarket, TeamLite } from "./types";

/** League badge presets (reference LeagueBadge.tsx PRESETS keys). */
export type LeagueKey = "epl" | "laliga" | "ucl" | "seriea" | "mls" | "nba" | "wc";

/** A 0..1 price as whole cents. */
export const cents = (price: number) => Math.round(price * 100);

/** Exactly two outcomes: each outcome is a side of the same market. */
export const isBinaryMarket = (market: SportsMarket) => market.outcomes.length === 2;

/** Three or more outcomes: each is its own YES/NO sub-market. */
export const needsSideToggle = (market: SportsMarket) => market.outcomes.length >= 3;

/** Full display name: the team's name when there is a team. */
export const outcomeName = (outcome: Outcome) => outcome.team?.name ?? outcome.label;

/** Short alias: the team's short code when there is a team. */
export const outcomeAlias = (outcome: Outcome) => outcome.team?.short ?? outcome.label;

/** The 1X2 draw (reference draw.tsx). */
export const isDrawOutcome = (outcome: Outcome) => !outcome.team && (outcome.label === "Draw" || outcome.meta === "X");

/** 24h change in whole cents; 0 when the market has no delta. */
export const delta24hCents = (outcome: Outcome) =>
  typeof outcome.delta24h === "number" ? Math.round(outcome.delta24h * 100) : 0;

/** Question-heading category (reference EventQuestionHeading.tsx getMarketKindLabel). */
export function marketKindLabel(market: SportsMarket): string {
  if (market.kindLabel) return market.kindLabel;
  switch (market.kind) {
    case "league-winner":
      return "Tournament winner";
    case "top-scorer":
      return "Top scorer";
    case "player-prop":
      return "Player prop";
    case "match":
      return "Match";
    default:
      return "Market";
  }
}

/** League badge for the question heading, which knows MLS and the World Cup. */
export function questionLeagueKey(short: string): LeagueKey {
  const s = short.replace(/\s+/g, "").toLowerCase();
  if (s === "epl" || s === "premierleague") return "epl";
  if (s === "laliga") return "laliga";
  if (s === "ucl" || s === "championsleague") return "ucl";
  if (s === "seriea") return "seriea";
  if (s === "mls") return "mls";
  if (s === "nba") return "nba";
  if (s === "wc" || s === "worldcup" || s === "worldcup2026") return "wc";
  return "epl";
}

/** Leagues a positions-table row can carry (reference PositionRowData.league). */
export type PositionLeagueKey = "epl" | "laliga" | "ucl" | "seriea" | "nba";

/**
 * League badge for positions-table rows. The reference page maps only these five shorts, so
 * World Cup and MLS rows fall back to EPL (dev reference BUG-2, event.$id.tsx:109-123).
 */
export function positionLeagueKey(short: string): PositionLeagueKey {
  const s = short.toUpperCase();
  if (s === "EPL") return "epl";
  if (s === "LL") return "laliga";
  if (s === "UCL") return "ucl";
  if (s === "SA") return "seriea";
  if (s === "NBA") return "nba";
  return "epl";
}
