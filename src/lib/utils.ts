import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function initials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

/** Map a win/loss record to a standings point value (3 pts win, 1 pt split). */
export function computePoints(won: number, played: number): number {
  const lost = played - won;
  return won * 3 + (won > 0 && lost > 0 ? 1 : 0);
}
