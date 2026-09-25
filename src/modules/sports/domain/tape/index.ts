import { cents, outcomeName, type SportsMarket } from "../market";

/** A public fill on the live tape (reference LiveTape.tsx). */
export interface Fill {
  id: string;
  user: string;
  outcomeIdx: number;
  outcomeLabel: string;
  side: "buy" | "sell";
  /** ¢ */
  price: number;
  size: number;
  agoSec: number;
}

export const TAPE_ROWS = 8;
/** A new fill slides in this often; ages tick every second. */
export const TAPE_INJECT_MS = 4200;

const USERS = [
  "0xa1f…b2c",
  "luna.eth",
  "ronaldo7",
  "shark_99",
  "fan_paul",
  "wager_kid",
  "0x73c…1ee",
  "midfield_m",
  "stoxx",
  "ev_calc",
  "tilt_zero",
  "mbappe.fan",
];

/** Linear congruential generator in [0, 1) (LiveTape.tsx rand). */
export function seededRandom(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * One fill; the draws happen in the reference's order: outcome, jitter, user, side, size.
 * Null when the outcome draw misses (a negative seed yields negative draws).
 */
function drawFill(r: () => number, market: SportsMarket, id: string, agoSec: (r: () => number) => number): Fill | null {
  const outcomeIdx = Math.floor(r() * market.outcomes.length);
  const o = market.outcomes[outcomeIdx];
  if (!o) return null;
  const jitter = Math.floor(r() * 5) - 2;
  const user = USERS[Math.floor(r() * USERS.length)];
  const side = r() > 0.42 ? "buy" : "sell";
  const size = 10 + Math.floor(r() * 480);
  return {
    id,
    user,
    outcomeIdx,
    outcomeLabel: outcomeName(o),
    side,
    price: Math.max(1, Math.min(99, cents(o.price) + jitter)),
    size,
    agoSec: agoSec(r),
  };
}

/** The tape's first rows, fixed per market id. */
export function seedTape(market: SportsMarket, rows = TAPE_ROWS): Fill[] {
  const r = seededRandom([...market.id].reduce((acc, c) => acc + c.charCodeAt(0), 0) + 17);
  // Seeds are positive (a char-code sum), so every draw lands on an outcome.
  return Array.from({ length: rows }, (_, i) => drawFill(r, market, `seed-${i}`, (rr) => 4 + i * 6 + Math.floor(rr() * 9)) as Fill);
}

/**
 * A freshly injected fill, one second old. The reference seeds these with `Date.now()`, whose
 * 32-bit value is negative for weeks at a time; then every draw is negative, no fill is ever
 * added and only the ages keep ticking (dev reference BUG-11).
 */
export const nextFill = (r: () => number, market: SportsMarket, id: string): Fill | null => drawFill(r, market, id, () => 1);

/** One second later. */
export const ageTape = (fills: readonly Fill[]): Fill[] => fills.map((f) => ({ ...f, agoSec: f.agoSec + 1 }));

/** A new fill on top; the oldest drops off. */
export const injectFill = (fills: readonly Fill[], fill: Fill, rows = TAPE_ROWS): Fill[] => [fill, ...fills].slice(0, rows);

/** "8s", "3m", "2h"; never below 1s. */
export function formatAgo(s: number): string {
  if (s < 60) return `${Math.max(1, Math.floor(s))}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}
