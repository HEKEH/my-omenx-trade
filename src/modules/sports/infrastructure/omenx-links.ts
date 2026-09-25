/**
 * Links to the parent OmenX site (reference src/lib/omenx.ts). The sports zone links out for
 * wallet, account, portfolio and the other product areas.
 */
export const OMENX_BASE = "https://omenx.lovable.app";

export const omenxUrl = {
  wallet: () => `${OMENX_BASE}/wallet`,
  account: () => `${OMENX_BASE}/account`,
  portfolio: () => `${OMENX_BASE}/portfolio`,
  events: () => `${OMENX_BASE}/events`,
  settings: () => `${OMENX_BASE}/settings`,
  transparency: () => `${OMENX_BASE}/settings/transparency`,
} as const;
