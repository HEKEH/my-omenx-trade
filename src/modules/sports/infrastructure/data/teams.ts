// Teams used by the markets (reference src/data/sports-mock.ts `TEAMS`). Logos are the
// reference's external URLs (dev reference E-14).
import type { TeamLite } from "../../domain/market/types";

export const TEAMS = {
  chelsea: {
    name: "Chelsea",
    short: "CHE",
    logo: "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
    hue: 245,
  },
  psg: {
    name: "Paris SG",
    short: "PSG",
    logo: "https://a.espncdn.com/i/teamlogos/soccer/500/160.png",
    hue: 295,
  },
  manCity: {
    name: "Man City",
    short: "MCI",
    logo: "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
    hue: 210,
  },
  arsenal: {
    name: "Arsenal",
    short: "ARS",
    logo: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
    hue: 10,
  },
  barcelona: {
    name: "Barcelona",
    short: "BAR",
    logo: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png",
    hue: 250,
  },
  realMadrid: {
    name: "Real Madrid",
    short: "RMA",
    logo: "https://a.espncdn.com/i/teamlogos/soccer/500/86.png",
    hue: 270,
  },
  newcastle: {
    name: "Newcastle",
    short: "NEW",
    logo: "https://a.espncdn.com/i/teamlogos/soccer/500/361.png",
    hue: 0,
  },
  liverpool: {
    name: "Liverpool",
    short: "LIV",
    logo: "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
    hue: 15,
  },
  interMiami: {
    name: "Inter Miami",
    short: "MIA",
    logo: "https://a.espncdn.com/i/teamlogos/soccer/500/20232.png",
    hue: 340,
  },
  // ----- World Cup 2026 national teams (country flags via flagcdn) -----
  mexico: {
    name: "Mexico",
    short: "MEX",
    logo: "https://flagcdn.com/w160/mx.png",
    hue: 145,
  },
  southAfrica: {
    name: "South Africa",
    short: "RSA",
    logo: "https://flagcdn.com/w160/za.png",
    hue: 150,
  },
  koreaRep: {
    name: "Korea Republic",
    short: "KOR",
    logo: "https://flagcdn.com/w160/kr.png",
    hue: 215,
  },
  czechia: {
    name: "Czechia",
    short: "CZE",
    logo: "https://flagcdn.com/w160/cz.png",
    hue: 5,
  },
  canada: {
    name: "Canada",
    short: "CAN",
    logo: "https://flagcdn.com/w160/ca.png",
    hue: 15,
  },
  bosnia: {
    name: "Bosnia-Herzegovina",
    short: "BIH",
    logo: "https://flagcdn.com/w160/ba.png",
    hue: 230,
  },
  usa: {
    name: "United States",
    short: "USA",
    logo: "https://flagcdn.com/w160/us.png",
    hue: 220,
  },
  paraguay: {
    name: "Paraguay",
    short: "PAR",
    logo: "https://flagcdn.com/w160/py.png",
    hue: 10,
  },
  brazil: {
    name: "Brazil",
    short: "BRA",
    logo: "https://flagcdn.com/w160/br.png",
    hue: 145,
  },
  argentina: {
    name: "Argentina",
    short: "ARG",
    logo: "https://flagcdn.com/w160/ar.png",
    hue: 215,
  },
  france: {
    name: "France",
    short: "FRA",
    logo: "https://flagcdn.com/w160/fr.png",
    hue: 250,
  },
  england: {
    name: "England",
    short: "ENG",
    logo: "https://flagcdn.com/w160/gb-eng.png",
    hue: 25,
  },
  spain: {
    name: "Spain",
    short: "ESP",
    logo: "https://flagcdn.com/w160/es.png",
    hue: 30,
  },
  germany: {
    name: "Germany",
    short: "GER",
    logo: "https://flagcdn.com/w160/de.png",
    hue: 50,
  },
  japan: {
    name: "Japan",
    short: "JPN",
    logo: "https://flagcdn.com/w160/jp.png",
    hue: 0,
  },
} as const satisfies Record<string, TeamLite>;
