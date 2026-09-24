"use client";

import { useEffect, useState } from "react";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * "2d 04:05:06" until `endTime`, ticking every second, as the reference's
 * header countdown. The timer is cleared on unmount.
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

export function useCountdown(endTime: Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return formatCountdown(endTime, now);
}
