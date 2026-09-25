/**
 * Market data types, as in the reference (src/data/sports-mock.ts `TeamLite` and
 * src/data/sports-markets.ts). Prices are in 0..1 and render as ¢.
 */
export interface TeamLite {
  name: string;
  short: string;
  logo: string;
  /** Voter / supporter accent in oklch for poll bars and pill glow. */
  hue: number;
}

export type MarketKind = "match" | "league-winner" | "top-scorer" | "player-prop";

export interface Outcome {
  id: string;
  label: string;
  price: number; // 0..1
  delta24h?: number; // -1..1
  team?: TeamLite;
  meta?: string; // e.g. "10" jersey, "F" position
}

export interface SportsMarket {
  id: string;
  kind: MarketKind;
  /** Outcome shape — drives card layout. binary = 2 outcomes (YES/NO or A/B),
   *  three-way = 1X2 soccer-style. Inferable from outcomes.length but
   *  explicit keeps rendering decisions cheap. */
  shape: "binary" | "three-way";
  title: string;
  league: { name: string; short: string };
  endsLabel: string;
  volume: string;
  volume24h: string;
  participants: number;
  outcomes: Outcome[];
  fixture?: { home: TeamLite; away: TeamLite; kickoff: string; whenLabel: string };
  tradeHref: string;
  /** Calendar day offset from today (today=0, tomorrow=1, yesterday=-1). */
  dayOffset?: number;
  /** When true, this match is being streamed live on the platform right now.
   *  Rendered as a prominent LiveStreamCard at the top of the events grid. */
  isLiveStream?: boolean;
  /** Poster / stream still image for the live card (16:9). */
  livePoster?: string;
  /** Current in-match score (home — away). */
  liveScore?: { home: number; away: number };
  /** Match clock as `MM:SS` or `HH:MM:SS`, used both as a label and to
   *  drive the progress bar (assuming a 90-minute regulation match). */
  liveClock?: string;
  /** Tournament context label (e.g. "Group A · MD1", "Round of 32",
   *  "Quarter-final", "Player prop"). When the card is rendered inside
   *  a tournament hub the league chip is replaced by this stage chip —
   *  league is implied by the hub, stage is the useful axis. */
  stage?: string;
  /** Short row label used when this market renders inside a bundle whose
   *  parent event already supplies the question context (e.g. row label
   *  "Brazil" inside a "World Cup Champion" card instead of repeating
   *  "Brazil to win the World Cup 2026"). */
  subject?: string;
  /** Optional team/entity the market is about — drives the row crest
   *  inside bundled props cards. */
  subjectTeam?: TeamLite;
  /** When this market is a single row inside a bundled multi-outcome event
   *  (e.g. "Brazil" inside the "World Cup Champion" event), point to the
   *  consolidated event market id so the card link and trade drawer open
   *  the right page instead of a per-team binary stub. */
  eventMarketId?: string;
  /** The outcome id (inside the consolidated event market) that this row
   *  represents — used to preselect the right outcome in the trade drawer. */
  eventOutcomeId?: string;
  /** Human-readable label for the event's question kind, e.g.
   *  "Tournament winner", "Top scorer", "Group winner". Rendered in the
   *  non-fixture event header above the title so the page works for
   *  questions that don't map to a single team/player. */
  kindLabel?: string;
}
