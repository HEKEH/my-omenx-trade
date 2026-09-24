/**
 * Browser-local preferences, under the reference project's keys. Every access
 * is guarded: storage can be unavailable (private mode, blocked site data).
 */

const KEYS = {
  favorites: "trading_favorites",
  lastEvent: "trading_last_event",
  lastOption: "trading_last_option",
} as const;

const read = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferences are best-effort.
  }
};

const readJson = <T>(key: string, fallback: T): T => {
  const raw = read(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const loadFavorites = (): string[] => {
  const value = readJson<unknown>(KEYS.favorites, []);
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
};

export const saveFavorites = (ids: readonly string[]) => write(KEYS.favorites, JSON.stringify(ids));

export const loadLastEvent = () => read(KEYS.lastEvent);

export const saveLastEvent = (eventId: string) => write(KEYS.lastEvent, eventId);

export const loadLastOptions = (): Record<string, string> => {
  const value = readJson<unknown>(KEYS.lastOption, {});
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, string>) : {};
};

export const saveLastOption = (eventId: string, optionId: string) =>
  write(KEYS.lastOption, JSON.stringify({ ...loadLastOptions(), [eventId]: optionId }));
