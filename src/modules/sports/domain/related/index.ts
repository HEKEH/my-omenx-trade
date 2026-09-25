import type { SportsMarket } from "../market";

const MAX_RELATED = 6;

/** Every team short on a market: fixture sides, subject team and outcome teams. */
function teamShorts(market: SportsMarket): Set<string> {
  const shorts = new Set<string>();
  if (market.fixture?.home?.short) shorts.add(market.fixture.home.short);
  if (market.fixture?.away?.short) shorts.add(market.fixture.away.short);
  if (market.subjectTeam?.short) shorts.add(market.subjectTeam.short);
  for (const o of market.outcomes) if (o.team?.short) shorts.add(o.team.short);
  return shorts;
}

/**
 * Other events sharing a team with this one, in data order, at most six (reference
 * related-markets.ts). Per-team stubs inside bundled events (`eventMarketId`) are skipped.
 */
export function relatedMarkets(market: SportsMarket, all: readonly SportsMarket[]): SportsMarket[] {
  const own = teamShorts(market);
  if (own.size === 0) return [];
  const results: SportsMarket[] = [];
  for (const other of all) {
    if (other.id === market.id || other.eventMarketId) continue;
    if ([...teamShorts(other)].some((short) => own.has(short))) results.push(other);
    if (results.length >= MAX_RELATED) break;
  }
  return results;
}
