import type { SportsMarket } from "../domain/market/types";
import { ACCOUNT_STATS } from "./data/account";
import { ALL_MARKETS } from "./data/sports-markets";

/**
 * Mock repositories over the ported static data (dev reference §6). The reference has no
 * data API (E-02), so these read in-memory tables synchronously.
 */
export const marketRepository = {
  getById(id: string): SportsMarket | undefined {
    return ALL_MARKETS.find((market) => market.id === id);
  },
  list(): readonly SportsMarket[] {
    return ALL_MARKETS;
  },
};

export interface AccountStats {
  available: string;
  openPositions: number;
  pnlToday: string;
  toClaim: string;
}

export const accountRepository = {
  getStats(): AccountStats {
    return ACCOUNT_STATS;
  },
};

export interface CurrentUser {
  name: string;
  avatar: string;
}

// Hard-coded on the reference's event page (event.$id.tsx:556-560).
const CURRENT_USER: CurrentUser = {
  name: "Jeremy",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=faces&q=80",
};

export const profileRepository = {
  getCurrentUser(): CurrentUser {
    return CURRENT_USER;
  },
};
