import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Class merging for the sports page: clsx + tailwind-merge, the same pair and versions the
 * reference uses, so conflicting utilities (a `max-w-md` passed over a default `max-w-lg`)
 * resolve the same way there and here.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
