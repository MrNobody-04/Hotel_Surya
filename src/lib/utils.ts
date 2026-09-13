import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Nepalese Rupees (NPR)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "NPR 0";
  }
  return `NPR ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date in Asia/Kathmandu timezone (Nepal Time, UTC+5:45)
 */
export function formatNepalDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatNepalDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatNepalTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function getTodayNepalDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // returns YYYY-MM-DD
}

export type TimePeriod = "TODAY" | "YESTERDAY" | "WEEK" | "ALL";

/**
 * Returns UTC Date objects for start and end of a given period in Nepal timezone (UTC+5:45).
 */
export function getNepalDateRange(period: TimePeriod | string | null | undefined): { startDate: Date; endDate: Date } | null {
  if (!period || period === "ALL") return null;

  const now = new Date();
  const nepalOffsetMs = 5.75 * 60 * 60 * 1000;
  const nepalNow = new Date(now.getTime() + nepalOffsetMs);

  const nepalYear = nepalNow.getUTCFullYear();
  const nepalMonth = nepalNow.getUTCMonth();
  const nepalDate = nepalNow.getUTCDate();

  if (period === "TODAY") {
    const startDate = new Date(Date.UTC(nepalYear, nepalMonth, nepalDate, 0, 0, 0, 0) - nepalOffsetMs);
    const endDate = new Date(Date.UTC(nepalYear, nepalMonth, nepalDate, 23, 59, 59, 999) - nepalOffsetMs);
    return { startDate, endDate };
  }

  if (period === "YESTERDAY") {
    const startDate = new Date(Date.UTC(nepalYear, nepalMonth, nepalDate - 1, 0, 0, 0, 0) - nepalOffsetMs);
    const endDate = new Date(Date.UTC(nepalYear, nepalMonth, nepalDate - 1, 23, 59, 59, 999) - nepalOffsetMs);
    return { startDate, endDate };
  }

  if (period === "WEEK") {
    // Last 7 days including today (00:00:00 of 6 days ago through 23:59:59 today)
    const startDate = new Date(Date.UTC(nepalYear, nepalMonth, nepalDate - 6, 0, 0, 0, 0) - nepalOffsetMs);
    const endDate = new Date(Date.UTC(nepalYear, nepalMonth, nepalDate, 23, 59, 59, 999) - nepalOffsetMs);
    return { startDate, endDate };
  }

  return null;
}
