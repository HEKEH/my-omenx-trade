/** Display formatting only; no business rules live here. */

/** `$0.2891` */
export const formatPrice = (price: number) => `$${price.toFixed(4)}`;

/** `0.2891` */
export const formatPriceBare = (price: number) => price.toFixed(4);

/** `$1,234.56` (negative as `-$1,234.56`) */
export const formatUsd = (value: number) => {
  const abs = Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `-$${abs}` : `$${abs}`;
};

/** `+$12.34` / `-$12.34` */
export const formatSignedUsd = (value: number) => `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;

/** `+1.5%` */
export const formatSignedPercent = (value: number, digits = 1) => `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;

/** `3,459` */
export const formatInteger = (value: number) => Math.round(value).toLocaleString("en-US");

/** Balance as the reference shows it: `toLocaleString()` of the number. */
export const formatBalance = (value: number) => value.toLocaleString("en-US");

/** "5 mins ago", matching the reference's order list. */
export const formatTimeAgo = (iso: string, now: Date = new Date()) => {
  const diffMinutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

/** "Jan 20, 2026" */
export const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
