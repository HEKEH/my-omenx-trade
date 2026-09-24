"use client";

import { useEffect, useState } from "react";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * "2d 04:05:06" until `endTime`, as the reference's header countdown
 * (empty when there is no end time, "00:00:00" once it has passed).
 */
export const formatCountdown = (endTime: Date | null, now: number) => {
  if (!endTime) return "";
  const diff = Math.max(0, endTime.getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
};

/** Current time, refreshed every `intervalMs`; the timer is cleared on unmount. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function useCountdown(endTime: Date | null) {
  return formatCountdown(endTime, useNow());
}
