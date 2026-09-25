/**
 * Sports markets (reference src/data/sports-markets.ts), copied as is: the OmenX
 * prediction-market data shape applied to match 1X2, league-winner futures, top-scorer and
 * player props. Prices are in 0..1; render as ¢ in the UI.
 */
import type { SportsMarket, TeamLite } from "../../domain/market/types";
import { TEAMS } from "./teams";
import { BRACKET_MARKETS, GROUP_OUTCOME_MARKETS, GROUP_WINNER_MARKETS } from "./tournament";

// Local asset (reference src/assets/mbappe.png), served from public/sports.
const mbappePhoto = "/sports/mbappe.png";

export const FEATURED_MATCH: SportsMarket = {
  id: "che-psg-2025-ucl",
  kind: "match",
  shape: "three-way",
  title: "United States vs Mexico — Full time result",
  league: { name: "World Cup 2026", short: "WC" },
  endsLabel: "Today 8:00pm",
  volume: "$612K",
  volume24h: "$184K",
  participants: 4821,
  fixture: { home: TEAMS.usa, away: TEAMS.mexico, kickoff: "8:00pm", whenLabel: "Today" },
  outcomes: [
    { id: "h", label: "USA", price: 0.46, delta24h: 0.03, team: TEAMS.usa },
    { id: "d", label: "Draw", price: 0.25, delta24h: -0.01, meta: "X" },
    { id: "a", label: "MEX", price: 0.29, delta24h: -0.02, team: TEAMS.mexico },
  ],
  tradeHref: `/event/che-psg-2025-ucl`,
  stage: "Group · MD2",
};

export const MATCH_MARKETS: SportsMarket[] = [
  // ----- FIFA World Cup 2026 — featured at the top of the home grid -----
  {
    id: "wc26-usa-par",
    kind: "match",
    shape: "three-way",
    title: "United States vs Paraguay",
    league: { name: "World Cup 2026", short: "WC" },
    endsLabel: "Today 9:00pm",
    volume: "$612K",
    volume24h: "$184K",
    participants: 4720,
    fixture: {
      home: TEAMS.usa,
      away: TEAMS.paraguay,
      kickoff: "9:00pm",
      whenLabel: "Today",
    },
    outcomes: [
      { id: "h", label: "USA", price: 0.48, delta24h: 0.03, team: TEAMS.usa },
      { id: "d", label: "Draw", price: 0.29, delta24h: 0, meta: "X" },
      { id: "a", label: "PAR", price: 0.25, delta24h: -0.03, team: TEAMS.paraguay },
    ],
    tradeHref: `/event/wc26-usa-par`,
    dayOffset: 0,
    isLiveStream: true,
    livePoster:
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&h=675&fit=crop&q=80",
    liveScore: { home: 1, away: 0 },
    liveClock: "00:38:12",
    stage: "Group D · MD1",
  },
  {
    id: "wc26-mex-rsa",
    kind: "match",
    shape: "three-way",
    title: "Mexico vs South Africa",
    league: { name: "World Cup 2026", short: "WC" },
    endsLabel: "Today 3:00pm",
    volume: "$497K",
    volume24h: "$124K",
    participants: 3120,
    fixture: {
      home: TEAMS.mexico,
      away: TEAMS.southAfrica,
      kickoff: "3:00pm",
      whenLabel: "Today",
    },
    outcomes: [
      { id: "h", label: "MEX", price: 0.67, delta24h: 0.04, team: TEAMS.mexico },
      { id: "d", label: "Draw", price: 0.22, delta24h: -0.01, meta: "X" },
      { id: "a", label: "RSA", price: 0.13, delta24h: -0.03, team: TEAMS.southAfrica },
    ],
    tradeHref: `/event/wc26-mex-rsa`,
    dayOffset: 0,
    isLiveStream: true,
    livePoster:
      "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&h=675&fit=crop&q=80",
    liveScore: { home: 2, away: 0 },
    liveClock: "01:04:22",
    stage: "Group A · MD1",
  },
  {
    id: "wc26-can-bih",
    kind: "match",
    shape: "three-way",
    title: "Canada vs Bosnia-Herzegovina",
    league: { name: "World Cup 2026", short: "WC" },
    endsLabel: "Tomorrow 3:00pm",
    volume: "$208K",
    volume24h: "$54K",
    participants: 1840,
    fixture: {
      home: TEAMS.canada,
      away: TEAMS.bosnia,
      kickoff: "3:00pm",
      whenLabel: "Tomorrow",
    },
    outcomes: [
      { id: "h", label: "CAN", price: 0.53, delta24h: 0.02, team: TEAMS.canada },
      { id: "d", label: "Draw", price: 0.26, delta24h: 0, meta: "X" },
      { id: "a", label: "BIH", price: 0.22, delta24h: -0.02, team: TEAMS.bosnia },
    ],
    tradeHref: `/event/wc26-can-bih`,
    dayOffset: 1,
    stage: "Group B · MD1",
  },
  {
    id: "wc26-kor-cze",
    kind: "match",
    shape: "three-way",
    title: "Korea Republic vs Czechia",
    league: { name: "World Cup 2026", short: "WC" },
    endsLabel: "Tomorrow 10:00pm",
    volume: "$162K",
    volume24h: "$41K",
    participants: 1480,
    fixture: {
      home: TEAMS.koreaRep,
      away: TEAMS.czechia,
      kickoff: "10:00pm",
      whenLabel: "Tomorrow",
    },
    outcomes: [
      { id: "h", label: "KOR", price: 0.37, delta24h: 0.01, team: TEAMS.koreaRep },
      { id: "d", label: "Draw", price: 0.31, delta24h: 0, meta: "X" },
      { id: "a", label: "CZE", price: 0.32, delta24h: -0.01, team: TEAMS.czechia },
    ],
    tradeHref: `/event/wc26-kor-cze`,
    dayOffset: 1,
    stage: "Group F · MD1",
  },
  {
    // Polymarket-style binary player prop, also surfaces on Props tab.
    id: "wc26-messi-plays",
    kind: "player-prop",
    shape: "binary",
    title: "Messi plays at the World Cup",
    league: { name: "World Cup 2026", short: "WC" },
    endsLabel: "Settles Jun 11, 2026",
    volume: "$176K",
    volume24h: "$3.2K",
    participants: 612,
    outcomes: [
      { id: "y", label: "YES", price: 0.97, delta24h: 0 },
      { id: "n", label: "NO", price: 0.03, delta24h: 0 },
    ],
    tradeHref: `/event/wc26-messi-plays`,
    dayOffset: 12,
    stage: "Player prop",
  },
  // ----- Club competitions (kept for league hubs) -----
  {
    id: "mci-ars",
    kind: "match",
    shape: "three-way",
    title: "Man City vs Arsenal",
    league: { name: "Premier League", short: "EPL" },
    endsLabel: "Today 6:00pm",
    volume: "$1.82M",
    volume24h: "$240K",
    participants: 2104,
    fixture: { home: TEAMS.manCity, away: TEAMS.arsenal, kickoff: "6:00pm", whenLabel: "Today" },
    outcomes: [
      { id: "h", label: "MCI", price: 0.48, delta24h: 0.02, team: TEAMS.manCity },
      { id: "d", label: "Draw", price: 0.24, delta24h: 0, meta: "X" },
      { id: "a", label: "ARS", price: 0.28, delta24h: -0.02, team: TEAMS.arsenal },
    ],
    tradeHref: `/event/a`,
    dayOffset: 0,
  },
  {
    // Binary two-team market (no draw) — e.g. NBA / playoff / knockout.
    id: "liv-new",
    kind: "match",
    shape: "binary",
    title: "Liverpool to beat Newcastle",
    league: { name: "Premier League", short: "EPL" },
    endsLabel: "23 Aug 4:30pm",
    volume: "$1.18M",
    volume24h: "$310K",
    participants: 2604,
    fixture: { home: TEAMS.liverpool, away: TEAMS.newcastle, kickoff: "4:30pm", whenLabel: "23 Aug" },
    outcomes: [
      { id: "h", label: "LIV", price: 0.63, delta24h: 0.04, team: TEAMS.liverpool },
      { id: "a", label: "NEW", price: 0.37, delta24h: -0.04, team: TEAMS.newcastle },
    ],
    tradeHref: `/event/a`,
    dayOffset: 1,
  },
  {
    // Binary single-market YES/NO event — non-match prop.
    id: "messi-hattrick",
    kind: "player-prop",
    shape: "binary",
    title: "Messi scores a hat-trick on Sunday",
    league: { name: "MLS", short: "MLS" },
    endsLabel: "28 Aug 9:00pm",
    volume: "$420K",
    volume24h: "$96K",
    participants: 1184,
    outcomes: [
      { id: "y", label: "YES", price: 0.18, delta24h: 0.02 },
      { id: "n", label: "NO", price: 0.82, delta24h: -0.02 },
    ],
    tradeHref: `/event/n`,
    dayOffset: 2,
  },
  {
    id: "rma-bar",
    kind: "match",
    shape: "three-way",
    title: "Real Madrid vs Barcelona",
    league: { name: "La Liga", short: "LL" },
    endsLabel: "Today 9:30pm",
    volume: "$3.10M",
    volume24h: "$540K",
    participants: 5240,
    fixture: { home: TEAMS.realMadrid, away: TEAMS.barcelona, kickoff: "9:30pm", whenLabel: "Today" },
    outcomes: [
      { id: "h", label: "RMA", price: 0.41, delta24h: 0.01, team: TEAMS.realMadrid },
      { id: "d", label: "Draw", price: 0.23, delta24h: 0, meta: "X" },
      { id: "a", label: "BAR", price: 0.36, delta24h: -0.01, team: TEAMS.barcelona },
    ],
    tradeHref: `/event/a`,
    dayOffset: 0,
  },
  {
    id: "che-psg-ucl",
    kind: "match",
    shape: "three-way",
    title: "Chelsea vs Paris SG",
    league: { name: "UEFA Champions League", short: "UCL" },
    endsLabel: "Tomorrow 8:00pm",
    volume: "$2.45M",
    volume24h: "$612K",
    participants: 4821,
    fixture: { home: TEAMS.chelsea, away: TEAMS.psg, kickoff: "8:00pm", whenLabel: "Tomorrow" },
    outcomes: [
      { id: "h", label: "CHE", price: 0.42, delta24h: 0.03, team: TEAMS.chelsea },
      { id: "d", label: "Draw", price: 0.21, delta24h: -0.01, meta: "X" },
      { id: "a", label: "PSG", price: 0.37, delta24h: -0.02, team: TEAMS.psg },
    ],
    tradeHref: `/event/a`,
    dayOffset: 1,
  },
  {
    id: "ars-new",
    kind: "match",
    shape: "binary",
    title: "Arsenal to beat Newcastle",
    league: { name: "Premier League", short: "EPL" },
    endsLabel: "In 3 days",
    volume: "$880K",
    volume24h: "$140K",
    participants: 1820,
    fixture: { home: TEAMS.arsenal, away: TEAMS.newcastle, kickoff: "5:30pm", whenLabel: "Sat" },
    outcomes: [
      { id: "h", label: "ARS", price: 0.66, delta24h: 0.02, team: TEAMS.arsenal },
      { id: "a", label: "NEW", price: 0.34, delta24h: -0.02, team: TEAMS.newcastle },
    ],
    tradeHref: `/event/a`,
    dayOffset: 3,
  },
  {
    id: "haaland-2g",
    kind: "player-prop",
    shape: "binary",
    title: "Haaland 2+ goals vs Arsenal",
    league: { name: "Premier League", short: "EPL" },
    endsLabel: "Today 6:00pm",
    volume: "$310K",
    volume24h: "$72K",
    participants: 940,
    outcomes: [
      { id: "y", label: "YES", price: 0.31, delta24h: 0.03 },
      { id: "n", label: "NO", price: 0.69, delta24h: -0.03 },
    ],
    tradeHref: `/event/n`,
    dayOffset: 0,
  },
  {
    id: "mci-tot-recap",
    kind: "match",
    shape: "three-way",
    title: "Man City vs Tottenham — settled",
    league: { name: "Premier League", short: "EPL" },
    endsLabel: "Yesterday 8:00pm",
    volume: "$1.42M",
    volume24h: "$0",
    participants: 2380,
    fixture: { home: TEAMS.manCity, away: TEAMS.arsenal, kickoff: "8:00pm", whenLabel: "Yesterday" },
    outcomes: [
      { id: "h", label: "MCI", price: 0.72, delta24h: 0, team: TEAMS.manCity },
      { id: "d", label: "Draw", price: 0.16, delta24h: 0, meta: "X" },
      { id: "a", label: "TOT", price: 0.12, delta24h: 0, team: TEAMS.arsenal },
    ],
    tradeHref: `/event/a`,
    dayOffset: -1,
  },
];

/** Standalone Y/N events that don't belong to a fixture/league market list.
 *  These exist so the "Related events" strip on a match page can surface
 *  truly related questions (e.g. "Canada to advance" on the Canada vs BiH
 *  page) without us building handicap/alt-line products. */
export const STANDALONE_QUESTION_MARKETS: SportsMarket[] = [
  {
    id: "wc26-can-advance",
    kind: "league-winner",
    shape: "binary",
    title: "Canada to advance from group stage",
    kindLabel: "Group stage",
    subject: "Canada",
    subjectTeam: TEAMS.canada,
    league: { name: "World Cup 2026", short: "WC" },
    endsLabel: "Settles Jun 28, 2026",
    volume: "$184K",
    volume24h: "$24K",
    participants: 920,
    outcomes: [
      { id: "y", label: "Yes", price: 0.61, delta24h: 0.03 },
      { id: "n", label: "No", price: 0.39, delta24h: -0.03 },
    ],
    tradeHref: `/event/wc26-can-advance`,
  },
  {
    id: "wc26-bih-advance",
    kind: "league-winner",
    shape: "binary",
    title: "Bosnia-Herzegovina to advance from group stage",
    kindLabel: "Group stage",
    subject: "Bosnia-Herzegovina",
    subjectTeam: TEAMS.bosnia,
    league: { name: "World Cup 2026", short: "WC" },
    endsLabel: "Settles Jun 28, 2026",
    volume: "$96K",
    volume24h: "$14K",
    participants: 540,
    outcomes: [
      { id: "y", label: "Yes", price: 0.32, delta24h: -0.02 },
      { id: "n", label: "No", price: 0.68, delta24h: 0.02 },
    ],
    tradeHref: `/event/wc26-bih-advance`,
  },
  {
    id: "wc26-can-clean-sheet",
    kind: "match",
    shape: "binary",
    title: "Canada to keep a clean sheet vs Bosnia-Herzegovina",
    kindLabel: "Match question",
    subject: "Canada",
    subjectTeam: TEAMS.canada,
    league: { name: "World Cup 2026", short: "WC" },
    endsLabel: "Tomorrow 3:00pm",
    volume: "$58K",
    volume24h: "$12K",
    participants: 310,
    fixture: {
      home: TEAMS.canada,
      away: TEAMS.bosnia,
      kickoff: "3:00pm",
      whenLabel: "Tomorrow",
    },
    outcomes: [
      { id: "y", label: "Yes", price: 0.37, delta24h: 0.01 },
      { id: "n", label: "No", price: 0.63, delta24h: -0.01 },
    ],
    tradeHref: `/event/wc26-can-clean-sheet`,
    dayOffset: 1,
    stage: "Group B · MD1",
  },
];

export const LEAGUE_WINNER_MARKET: SportsMarket = {
  id: "epl-winner-25-26",
  kind: "league-winner",
  shape: "three-way",
  title: "Premier League — Winner 25/26",
  league: { name: "Premier League", short: "EPL" },
  endsLabel: "Settles May 24, 2026",
  volume: "$12.4M",
  volume24h: "$1.1M",
  participants: 18420,
  outcomes: [
    { id: "mci", label: "Man City", price: 0.38, delta24h: 0.02, team: TEAMS.manCity },
    { id: "ars", label: "Arsenal", price: 0.31, delta24h: 0.04, team: TEAMS.arsenal },
    { id: "liv", label: "Liverpool", price: 0.18, delta24h: -0.01, team: TEAMS.liverpool },
    { id: "new", label: "Newcastle", price: 0.08, delta24h: -0.02, team: TEAMS.newcastle },
  ],
  tradeHref: `/event/new`,
};

export const TOP_SCORER_MARKET: SportsMarket = {
  id: "epl-top-scorer-25-26",
  kind: "top-scorer",
  shape: "three-way",
  title: "Premier League — Top scorer 25/26",
  league: { name: "Premier League", short: "EPL" },
  endsLabel: "Settles May 24, 2026",
  volume: "$3.6M",
  volume24h: "$420K",
  participants: 6210,
  outcomes: [
    {
      id: "messi",
      label: "L. Messi",
      price: 0.34,
      delta24h: 0.03,
      team: TEAMS.interMiami,
      meta: "21G · #10",
    },
    {
      id: "haaland",
      label: "E. Haaland",
      price: 0.41,
      delta24h: -0.02,
      team: TEAMS.manCity,
      meta: "16G · #17",
    },
  ],
  tradeHref: `/event/haaland`,
};

/* ---------------- Additional season markets (LaLiga, UCL) ---------------- */

export const LALIGA_WINNER_MARKET: SportsMarket = {
  id: "laliga-winner-25-26",
  kind: "league-winner",
  shape: "three-way",
  title: "La Liga — Winner 25/26",
  league: { name: "La Liga", short: "LL" },
  endsLabel: "Settles May 24, 2026",
  volume: "$8.7M",
  volume24h: "$640K",
  participants: 11240,
  outcomes: [
    { id: "rma", label: "Real Madrid", price: 0.46, delta24h: 0.03, team: TEAMS.realMadrid },
    { id: "bar", label: "Barcelona", price: 0.39, delta24h: -0.01, team: TEAMS.barcelona },
    { id: "atm", label: "Atlético Madrid", price: 0.12, delta24h: -0.01 },
    { id: "sev", label: "Sevilla", price: 0.03, delta24h: -0.01 },
  ],
  tradeHref: `/event/laliga-winner-25-26`,
};

export const UCL_WINNER_MARKET: SportsMarket = {
  id: "ucl-winner-25-26",
  kind: "league-winner",
  shape: "three-way",
  title: "Champions League — Winner 25/26",
  league: { name: "UEFA Champions League", short: "UCL" },
  endsLabel: "Settles May 30, 2026",
  volume: "$18.2M",
  volume24h: "$1.8M",
  participants: 24120,
  outcomes: [
    { id: "mci", label: "Man City", price: 0.32, delta24h: 0.02, team: TEAMS.manCity },
    { id: "rma", label: "Real Madrid", price: 0.28, delta24h: 0.01, team: TEAMS.realMadrid },
    { id: "psg", label: "Paris SG", price: 0.18, delta24h: -0.02, team: TEAMS.psg },
    { id: "liv", label: "Liverpool", price: 0.14, delta24h: 0.01, team: TEAMS.liverpool },
  ],
  tradeHref: `/event/ucl-winner-25-26`,
};

export const LALIGA_TOP_SCORER_MARKET: SportsMarket = {
  id: "laliga-top-scorer-25-26",
  kind: "top-scorer",
  shape: "three-way",
  title: "La Liga — Top scorer 25/26",
  league: { name: "La Liga", short: "LL" },
  endsLabel: "Settles May 24, 2026",
  volume: "$2.4M",
  volume24h: "$310K",
  participants: 4820,
  outcomes: [
    {
      id: "mbappe",
      label: "K. Mbappé",
      price: 0.52,
      delta24h: 0.04,
      team: TEAMS.realMadrid,
      meta: "19G · #9",
    },
    {
      id: "lewandowski",
      label: "R. Lewandowski",
      price: 0.34,
      delta24h: -0.02,
      team: TEAMS.barcelona,
      meta: "14G · #9",
    },
  ],
  tradeHref: `/event/laliga-top-scorer-25-26`,
};

export const UCL_TOP_SCORER_MARKET: SportsMarket = {
  id: "ucl-top-scorer-25-26",
  kind: "top-scorer",
  shape: "three-way",
  title: "Champions League — Top scorer 25/26",
  league: { name: "UEFA Champions League", short: "UCL" },
  endsLabel: "Settles May 30, 2026",
  volume: "$1.9M",
  volume24h: "$260K",
  participants: 3640,
  outcomes: [
    {
      id: "haaland",
      label: "E. Haaland",
      price: 0.44,
      delta24h: 0.02,
      team: TEAMS.manCity,
      meta: "8G · #17",
    },
    {
      id: "mbappe",
      label: "K. Mbappé",
      price: 0.38,
      delta24h: 0.03,
      team: TEAMS.realMadrid,
      meta: "7G · #9",
    },
  ],
  tradeHref: `/event/ucl-top-scorer-25-26`,
};

/**
 * Season-event groups rendered on the dashboard. Each group is one league:
 * a Winner market + a Top scorer market. Photos are optional and only
 * supplied when we have hand-curated portraits; otherwise the top-scorer
 * card falls back to the player's club crest.
 */
export const SEASON_LEAGUE_GROUPS: Array<{
  id: string;
  winner: SportsMarket;
  topScorer: SportsMarket;
  photos?: Record<string, string>;
}> = [
  {
    id: "epl",
    winner: LEAGUE_WINNER_MARKET,
    topScorer: TOP_SCORER_MARKET,
    photos: {
      messi: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=400&fit=crop&q=80",
      haaland: "https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=400&h=400&fit=crop&q=80",
    },
  },
  {
    id: "ucl",
    winner: UCL_WINNER_MARKET,
    topScorer: UCL_TOP_SCORER_MARKET,
    photos: {
      haaland: "https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=400&h=400&fit=crop&q=80",
      mbappe: mbappePhoto,
    },
  },
  {
    id: "laliga",
    winner: LALIGA_WINNER_MARKET,
    topScorer: LALIGA_TOP_SCORER_MARKET,
    photos: {
      mbappe: mbappePhoto,
    },
  },
];

export interface PlayerSpotlight {
  handle: string;
  firstName: string;
  lastName: string;
  position: string;
  club: TeamLite;
  photo: string;
  props: SportsMarket[];
  /** How to render the portrait image. "cover" for player photos,
   *  "contain" for crests / trophies. Defaults to "cover". */
  imageFit?: "cover" | "contain";
  /** Optional marketing tagline rendered under the title in
   *  the horizontal "Featured props" card. */
  tagline?: string;
}

const MBAPPE_SPOTLIGHT: PlayerSpotlight = {
  handle: "MBAPPE_KM",
  firstName: "Kylian",
  lastName: "Mbappé",
  position: "Forward · Real Madrid",
  club: TEAMS.realMadrid,
  tagline: "Stack his shooting props before kickoff.",
  photo:
    mbappePhoto,
  props: [
    {
      id: "mbappe-anytime",
      kind: "player-prop",
      shape: "binary",
      title: "Anytime goalscorer",
      league: { name: "La Liga", short: "LL" },
      endsLabel: "Today 8:00pm",
      volume: "$184K",
      volume24h: "$42K",
      participants: 612,
      outcomes: [
        { id: "y", label: "Yes", price: 0.71, delta24h: 0.04 },
        { id: "n", label: "No", price: 0.29, delta24h: -0.04 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "mbappe-2plus",
      kind: "player-prop",
      shape: "binary",
      title: "2+ goals scored",
      league: { name: "La Liga", short: "LL" },
      endsLabel: "Today 8:00pm",
      volume: "$96K",
      volume24h: "$22K",
      participants: 318,
      outcomes: [
        { id: "y", label: "Yes", price: 0.28, delta24h: 0.02 },
        { id: "n", label: "No", price: 0.72, delta24h: -0.02 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "mbappe-shots",
      kind: "player-prop",
      shape: "binary",
      title: "Over 3.5 shots on target",
      league: { name: "La Liga", short: "LL" },
      endsLabel: "Today 8:00pm",
      volume: "$58K",
      volume24h: "$11K",
      participants: 204,
      outcomes: [
        { id: "o", label: "Over", price: 0.46, delta24h: 0.01 },
        { id: "u", label: "Under", price: 0.54, delta24h: -0.01 },
      ],
      tradeHref: `/event/u`,
    },
  ],
};

const CHELSEA_SPOTLIGHT: PlayerSpotlight = {
  handle: "CHELSEA_FC",
  firstName: "Chelsea",
  lastName: "Treble Watch",
  position: "Premier League · Club futures",
  club: TEAMS.chelsea,
  tagline: "Three season-long futures, one bundle.",
  photo: TEAMS.chelsea.logo,
  imageFit: "contain",
  props: [
    {
      id: "che-epl-win",
      kind: "league-winner",
      shape: "binary",
      title: "Win the Premier League",
      league: { name: "Premier League", short: "EPL" },
      endsLabel: "End of season",
      volume: "$612K",
      volume24h: "$58K",
      participants: 1842,
      outcomes: [
        { id: "y", label: "Yes", price: 0.18, delta24h: 0.02 },
        { id: "n", label: "No", price: 0.82, delta24h: -0.02 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "che-top4",
      kind: "league-winner",
      shape: "binary",
      title: "Finish top 4",
      league: { name: "Premier League", short: "EPL" },
      endsLabel: "End of season",
      volume: "$840K",
      volume24h: "$72K",
      participants: 2410,
      outcomes: [
        { id: "y", label: "Yes", price: 0.66, delta24h: 0.03 },
        { id: "n", label: "No", price: 0.34, delta24h: -0.03 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "che-ucl-qual",
      kind: "league-winner",
      shape: "binary",
      title: "Qualify for Champions League",
      league: { name: "Premier League", short: "EPL" },
      endsLabel: "End of season",
      volume: "$520K",
      volume24h: "$48K",
      participants: 1604,
      outcomes: [
        { id: "y", label: "Yes", price: 0.74, delta24h: 0.01 },
        { id: "n", label: "No", price: 0.26, delta24h: -0.01 },
      ],
      tradeHref: `/event/n`,
    },
  ],
};

const GROUP_F_SPOTLIGHT: PlayerSpotlight = {
  handle: "WC26_GROUP_F",
  firstName: "Group F",
  lastName: "Winner",
  position: "Group F · 4 nations",
  tagline: "Pick who tops Group F before the knockouts.",
  club: TEAMS.psg,
  photo:
    "https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=480&h=560&fit=crop&q=80",
  imageFit: "cover",
  props: [
    {
      id: "wc26-grpf-fra",
      kind: "league-winner",
      shape: "binary",
      title: "France to top Group F",
      subject: "France",
      subjectTeam: TEAMS.france,
      eventMarketId: "wc26-grpf-winner",
      eventOutcomeId: "fra",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jun 27, 2026",
      volume: "$1.10M",
      volume24h: "$140K",
      participants: 3120,
      outcomes: [
        { id: "y", label: "Yes", price: 0.52, delta24h: 0.03 },
        { id: "n", label: "No", price: 0.48, delta24h: -0.03 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "wc26-grpf-ger",
      kind: "league-winner",
      shape: "binary",
      title: "Germany to top Group F",
      subject: "Germany",
      subjectTeam: TEAMS.germany,
      eventMarketId: "wc26-grpf-winner",
      eventOutcomeId: "ger",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jun 27, 2026",
      volume: "$680K",
      volume24h: "$92K",
      participants: 2010,
      outcomes: [
        { id: "y", label: "Yes", price: 0.31, delta24h: -0.02 },
        { id: "n", label: "No", price: 0.69, delta24h: 0.02 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "wc26-grpf-jpn",
      kind: "league-winner",
      shape: "binary",
      title: "Japan to top Group F",
      subject: "Japan",
      subjectTeam: TEAMS.japan,
      eventMarketId: "wc26-grpf-winner",
      eventOutcomeId: "jpn",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jun 27, 2026",
      volume: "$240K",
      volume24h: "$36K",
      participants: 860,
      outcomes: [
        { id: "y", label: "Yes", price: 0.12, delta24h: 0.01 },
        { id: "n", label: "No", price: 0.88, delta24h: -0.01 },
      ],
      tradeHref: `/event/n`,
    },
  ],
};

const WC_CHAMPION_SPOTLIGHT: PlayerSpotlight = {
  handle: "WC26_CHAMPION",
  firstName: "World Cup",
  lastName: "Champion",
  position: "Tournament winner · 48 nations",
  tagline: "The headline market — who lifts the trophy in MetLife.",
  club: TEAMS.usa,
  photo:
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=480&h=560&fit=crop&q=80",
  imageFit: "cover",
  props: [
    {
      id: "wc26-champ-bra",
      kind: "league-winner",
      shape: "binary",
      title: "Brazil to win the World Cup 2026",
      subject: "Brazil",
      subjectTeam: TEAMS.brazil,
      eventMarketId: "wc26-champion",
      eventOutcomeId: "bra",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jul 19, 2026",
      volume: "$2.40M",
      volume24h: "$310K",
      participants: 6420,
      outcomes: [
        { id: "y", label: "Yes", price: 0.18, delta24h: 0.02 },
        { id: "n", label: "No", price: 0.82, delta24h: -0.02 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "wc26-champ-arg",
      kind: "league-winner",
      shape: "binary",
      title: "Argentina to win the World Cup 2026",
      subject: "Argentina",
      subjectTeam: TEAMS.argentina,
      eventMarketId: "wc26-champion",
      eventOutcomeId: "arg",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jul 19, 2026",
      volume: "$2.10M",
      volume24h: "$280K",
      participants: 5840,
      outcomes: [
        { id: "y", label: "Yes", price: 0.16, delta24h: -0.01 },
        { id: "n", label: "No", price: 0.84, delta24h: 0.01 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "wc26-champ-fra",
      kind: "league-winner",
      shape: "binary",
      title: "France to win the World Cup 2026",
      subject: "France",
      subjectTeam: TEAMS.france,
      eventMarketId: "wc26-champion",
      eventOutcomeId: "fra",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jul 19, 2026",
      volume: "$1.80M",
      volume24h: "$240K",
      participants: 4910,
      outcomes: [
        { id: "y", label: "Yes", price: 0.14, delta24h: 0.01 },
        { id: "n", label: "No", price: 0.86, delta24h: -0.01 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "wc26-champ-eng",
      kind: "league-winner",
      shape: "binary",
      title: "England to win the World Cup 2026",
      subject: "England",
      subjectTeam: TEAMS.england,
      eventMarketId: "wc26-champion",
      eventOutcomeId: "eng",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jul 19, 2026",
      volume: "$1.45M",
      volume24h: "$190K",
      participants: 4220,
      outcomes: [
        { id: "y", label: "Yes", price: 0.11, delta24h: 0 },
        { id: "n", label: "No", price: 0.89, delta24h: 0 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "wc26-champ-spa",
      kind: "league-winner",
      shape: "binary",
      title: "Spain to win the World Cup 2026",
      subject: "Spain",
      subjectTeam: TEAMS.spain,
      eventMarketId: "wc26-champion",
      eventOutcomeId: "spa",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jul 19, 2026",
      volume: "$1.20M",
      volume24h: "$160K",
      participants: 3680,
      outcomes: [
        { id: "y", label: "Yes", price: 0.10, delta24h: 0.01 },
        { id: "n", label: "No", price: 0.90, delta24h: -0.01 },
      ],
      tradeHref: `/event/n`,
    },
  ],
};

export const WC_CHAMPION_MARKET: SportsMarket = {
  id: "wc26-champion",
  kind: "league-winner",
  shape: "three-way",
  title: "World Cup 2026 — Champion",
  kindLabel: "Tournament winner · 48 nations",
  league: { name: "World Cup 2026", short: "WC" },
  endsLabel: "Settles Jul 19, 2026",
  volume: "$8.95M",
  volume24h: "$1.18M",
  participants: 25070,
  outcomes: [
    { id: "bra", label: "Brazil", price: 0.18, delta24h: 0.02, team: TEAMS.brazil },
    { id: "arg", label: "Argentina", price: 0.16, delta24h: -0.01, team: TEAMS.argentina },
    { id: "fra", label: "France", price: 0.14, delta24h: 0.01, team: TEAMS.france },
    { id: "eng", label: "England", price: 0.11, delta24h: 0, team: TEAMS.england },
    { id: "spa", label: "Spain", price: 0.10, delta24h: 0.01, team: TEAMS.spain },
  ],
  tradeHref: `/event/wc26-champion`,
};

const WC_GOLDEN_BOOT_SPOTLIGHT: PlayerSpotlight = {
  handle: "WC26_GOLDEN_BOOT",
  firstName: "Golden",
  lastName: "Boot",
  position: "Top scorer · Tournament award",
  tagline: "Who out-shoots the field across seven matches?",
  club: TEAMS.realMadrid,
  photo: mbappePhoto,
  imageFit: "cover",
  props: [
    {
      id: "wc26-boot-mbappe",
      kind: "player-prop",
      shape: "binary",
      title: "Mbappé to win the Golden Boot",
      subject: "Mbappé",
      eventMarketId: "wc26-golden-boot",
      eventOutcomeId: "mbappe",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jul 19, 2026",
      volume: "$920K",
      volume24h: "$118K",
      participants: 2840,
      outcomes: [
        { id: "y", label: "Yes", price: 0.22, delta24h: 0.03 },
        { id: "n", label: "No", price: 0.78, delta24h: -0.03 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "wc26-boot-haaland",
      kind: "player-prop",
      shape: "binary",
      title: "Haaland to win the Golden Boot",
      subject: "Haaland",
      eventMarketId: "wc26-golden-boot",
      eventOutcomeId: "haaland",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jul 19, 2026",
      volume: "$640K",
      volume24h: "$82K",
      participants: 1980,
      outcomes: [
        { id: "y", label: "Yes", price: 0.16, delta24h: -0.02 },
        { id: "n", label: "No", price: 0.84, delta24h: 0.02 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "wc26-boot-vinicius",
      kind: "player-prop",
      shape: "binary",
      title: "Vinícius Jr. to win the Golden Boot",
      subject: "Vinícius Jr.",
      eventMarketId: "wc26-golden-boot",
      eventOutcomeId: "vinicius",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jul 19, 2026",
      volume: "$420K",
      volume24h: "$54K",
      participants: 1310,
      outcomes: [
        { id: "y", label: "Yes", price: 0.13, delta24h: 0.01 },
        { id: "n", label: "No", price: 0.87, delta24h: -0.01 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "wc26-boot-kane",
      kind: "player-prop",
      shape: "binary",
      title: "Kane to win the Golden Boot",
      subject: "Kane",
      eventMarketId: "wc26-golden-boot",
      eventOutcomeId: "kane",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jul 19, 2026",
      volume: "$360K",
      volume24h: "$44K",
      participants: 1140,
      outcomes: [
        { id: "y", label: "Yes", price: 0.11, delta24h: 0 },
        { id: "n", label: "No", price: 0.89, delta24h: 0 },
      ],
      tradeHref: `/event/n`,
    },
  ],
};

const WC_GROUP_A_SPOTLIGHT: PlayerSpotlight = {
  handle: "WC26_GROUP_A",
  firstName: "Group A",
  lastName: "Winner",
  position: "Group A · 4 nations",
  tagline: "The host nations open the tournament — who tops the group?",
  club: TEAMS.mexico,
  photo:
    "https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=480&h=560&fit=crop&q=80",
  imageFit: "cover",
  props: [
    {
      id: "wc26-grpa-mex",
      kind: "league-winner",
      shape: "binary",
      title: "Mexico to top Group A",
      subject: "Mexico",
      subjectTeam: TEAMS.mexico,
      eventMarketId: "wc26-grpa-winner",
      eventOutcomeId: "mex",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jun 24, 2026",
      volume: "$780K",
      volume24h: "$96K",
      participants: 2240,
      outcomes: [
        { id: "y", label: "Yes", price: 0.46, delta24h: 0.02 },
        { id: "n", label: "No", price: 0.54, delta24h: -0.02 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "wc26-grpa-can",
      kind: "league-winner",
      shape: "binary",
      title: "Canada to top Group A",
      subject: "Canada",
      subjectTeam: TEAMS.canada,
      eventMarketId: "wc26-grpa-winner",
      eventOutcomeId: "can",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jun 24, 2026",
      volume: "$420K",
      volume24h: "$52K",
      participants: 1380,
      outcomes: [
        { id: "y", label: "Yes", price: 0.28, delta24h: 0.03 },
        { id: "n", label: "No", price: 0.72, delta24h: -0.03 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "wc26-grpa-rsa",
      kind: "league-winner",
      shape: "binary",
      title: "South Africa to top Group A",
      subject: "South Africa",
      subjectTeam: TEAMS.southAfrica,
      eventMarketId: "wc26-grpa-winner",
      eventOutcomeId: "rsa",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jun 24, 2026",
      volume: "$210K",
      volume24h: "$28K",
      participants: 720,
      outcomes: [
        { id: "y", label: "Yes", price: 0.14, delta24h: -0.01 },
        { id: "n", label: "No", price: 0.86, delta24h: 0.01 },
      ],
      tradeHref: `/event/n`,
    },
    {
      id: "wc26-grpa-par",
      kind: "league-winner",
      shape: "binary",
      title: "Paraguay to top Group A",
      subject: "Paraguay",
      subjectTeam: TEAMS.paraguay,
      eventMarketId: "wc26-grpa-winner",
      eventOutcomeId: "par",
      league: { name: "World Cup 2026", short: "WC" },
      endsLabel: "Settles Jun 24, 2026",
      volume: "$180K",
      volume24h: "$22K",
      participants: 610,
      outcomes: [
        { id: "y", label: "Yes", price: 0.12, delta24h: 0.01 },
        { id: "n", label: "No", price: 0.88, delta24h: -0.01 },
      ],
      tradeHref: `/event/n`,
    },
  ],
};

export const SPOTLIGHTS: PlayerSpotlight[] = [
  MBAPPE_SPOTLIGHT,
  CHELSEA_SPOTLIGHT,
  WC_CHAMPION_SPOTLIGHT,
  WC_GOLDEN_BOOT_SPOTLIGHT,
  WC_GROUP_A_SPOTLIGHT,
  GROUP_F_SPOTLIGHT,
];

/* -------- Consolidated event markets for spotlight bundles. Each row of a
 * spotlight card opens one of these multi-outcome events so the trade page
 * renders the whole question (e.g. "World Cup Golden Boot") with every
 * contender as an outcome, not a per-player binary stub. */

export const WC_GOLDEN_BOOT_MARKET: SportsMarket = {
  id: "wc26-golden-boot",
  kind: "top-scorer",
  shape: "three-way",
  title: "World Cup 2026 — Golden Boot",
  kindLabel: "Top scorer · Tournament award",
  league: { name: "World Cup 2026", short: "WC" },
  endsLabel: "Settles Jul 19, 2026",
  volume: "$2.34M",
  volume24h: "$298K",
  participants: 7270,
  outcomes: [
    { id: "mbappe", label: "Mbappé", price: 0.22, delta24h: 0.03, meta: "FRA · #10" },
    { id: "haaland", label: "Haaland", price: 0.16, delta24h: -0.02, meta: "NOR · #9" },
    { id: "vinicius", label: "Vinícius Jr.", price: 0.13, delta24h: 0.01, meta: "BRA · #7" },
    { id: "kane", label: "Kane", price: 0.11, delta24h: 0, meta: "ENG · #9" },
  ],
  tradeHref: `/event/wc26-golden-boot`,
};

export const WC_GROUP_A_WINNER_MARKET: SportsMarket = {
  id: "wc26-grpa-winner",
  kind: "league-winner",
  shape: "three-way",
  title: "Group A — Winner",
  kindLabel: "Group winner · 4 nations",
  league: { name: "World Cup 2026", short: "WC" },
  endsLabel: "Settles Jun 24, 2026",
  volume: "$1.59M",
  volume24h: "$198K",
  participants: 4950,
  outcomes: [
    { id: "mex", label: "Mexico", price: 0.46, delta24h: 0.02, team: TEAMS.mexico },
    { id: "can", label: "Canada", price: 0.28, delta24h: 0.03, team: TEAMS.canada },
    { id: "rsa", label: "South Africa", price: 0.14, delta24h: -0.01, team: TEAMS.southAfrica },
    { id: "par", label: "Paraguay", price: 0.12, delta24h: 0.01, team: TEAMS.paraguay },
  ],
  tradeHref: `/event/wc26-grpa-winner`,
};

export const WC_GROUP_F_WINNER_MARKET: SportsMarket = {
  id: "wc26-grpf-winner",
  kind: "league-winner",
  shape: "three-way",
  title: "Group F — Winner",
  kindLabel: "Group winner · 4 nations",
  league: { name: "World Cup 2026", short: "WC" },
  endsLabel: "Settles Jun 27, 2026",
  volume: "$2.02M",
  volume24h: "$268K",
  participants: 5990,
  outcomes: [
    { id: "fra", label: "France", price: 0.52, delta24h: 0.03, team: TEAMS.france },
    { id: "ger", label: "Germany", price: 0.31, delta24h: -0.02, team: TEAMS.germany },
    { id: "jpn", label: "Japan", price: 0.12, delta24h: 0.01, team: TEAMS.japan },
  ],
  tradeHref: `/event/wc26-grpf-winner`,
};

/** @deprecated use SPOTLIGHTS */
export const SPOTLIGHT = MBAPPE_SPOTLIGHT;


/** Aggregated index for the /event/$id trade page lookup. */
export const ALL_MARKETS: SportsMarket[] = [
  FEATURED_MATCH,
  ...MATCH_MARKETS,
  ...STANDALONE_QUESTION_MARKETS,
  LEAGUE_WINNER_MARKET,
  TOP_SCORER_MARKET,
  LALIGA_WINNER_MARKET,
  UCL_WINNER_MARKET,
  LALIGA_TOP_SCORER_MARKET,
  UCL_TOP_SCORER_MARKET,
  WC_CHAMPION_MARKET,
  WC_GOLDEN_BOOT_MARKET,
  ...SPOTLIGHTS.flatMap((s) => s.props),
  ...GROUP_WINNER_MARKETS,
  ...BRACKET_MARKETS,
  ...GROUP_OUTCOME_MARKETS,
];

export function getMarketById(id: string): SportsMarket | undefined {
  return ALL_MARKETS.find((m) => m.id === id);
}
