import type { SportsMarket } from "../market";

const FORMATIONS = ["4-3-3", "4-2-3-1", "3-5-2", "4-4-2", "3-4-3"] as const;
const WEATHER = [
  { label: "Clear · 18°C", icon: "☀️" },
  { label: "Cloudy · 14°C", icon: "⛅" },
  { label: "Light rain · 12°C", icon: "🌦️" },
  { label: "Hot · 28°C", icon: "🌤️" },
] as const;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface PreMatchInfo {
  homeFormation: string;
  awayFormation: string;
  weather: { label: string; icon: string };
  /** Kickoff is this long after page load. */
  offsetMs: number;
}

/** Mock pre-match content, fixed per market id (reference PreMatchStrip.tsx). */
export function preMatchInfo(market: SportsMarket): PreMatchInfo {
  const seed = hash(market.id);
  return {
    homeFormation: FORMATIONS[seed % FORMATIONS.length],
    awayFormation: FORMATIONS[(seed >> 3) % FORMATIONS.length],
    weather: WEATHER[seed % WEATHER.length],
    offsetMs: (seed % (12 * 3600)) * 1000 + 30 * 60 * 1000,
  };
}

/** Zero-padded countdown parts; negative remaining time reads as zero. */
export function formatCountdown(ms: number): { d: string; h: string; m: string; s: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    d: pad(Math.floor(total / 86400)),
    h: pad(Math.floor((total % 86400) / 3600)),
    m: pad(Math.floor((total % 3600) / 60)),
    s: pad(total % 60),
  };
}
