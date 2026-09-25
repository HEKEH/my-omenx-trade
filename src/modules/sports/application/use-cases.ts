import { relatedMarkets, type SportsMarket } from "../domain";

/** What the page reads; infrastructure/repositories.ts implements these. */
export interface MarketCatalog {
  getById(id: string): SportsMarket | undefined;
  list(): readonly SportsMarket[];
}

export interface AccountStats {
  /** Pre-formatted, e.g. "$1,240.50". */
  available: string;
  openPositions: number;
  pnlToday: string;
  toClaim: string;
}

export interface CurrentUser {
  name: string;
  avatar: string;
}

export interface EventPageSources {
  markets: MarketCatalog;
  account: { getStats(): AccountStats };
  profile: { getCurrentUser(): CurrentUser };
}

export interface EventPageData {
  market: SportsMarket;
  related: SportsMarket[];
  account: AccountStats;
  user: CurrentUser;
}

/** Everything the event page needs, or null when the id is unknown. */
export function loadEventPage(id: string, sources: EventPageSources): EventPageData | null {
  const market = sources.markets.getById(id);
  if (!market) return null;
  return {
    market,
    related: relatedMarkets(market, sources.markets.list()),
    account: sources.account.getStats(),
    user: sources.profile.getCurrentUser(),
  };
}
