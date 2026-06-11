// Date utilities. All internal dates are ISO strings (yyyy-mm-dd) treated as
// calendar dates in local time (no timezone shifting).

import type { DateRange } from "../types";

/** Parse an ISO date string (yyyy-mm-dd) into a local Date at midnight. */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Date as an ISO date string (yyyy-mm-dd). */
export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Add a number of days to an ISO date, returning a new ISO date. */
export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Whole-day difference (b - a) between two ISO dates. */
export function daysBetween(a: string, b: string): number {
  const ms = parseISO(b).getTime() - parseISO(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Inclusive list of ISO dates from start to end. */
export function enumerateDays(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  if (!startISO || !endISO) return out;
  let cur = startISO;
  // Guard against reversed ranges.
  if (daysBetween(startISO, endISO) < 0) return out;
  while (daysBetween(cur, endISO) >= 0) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(iso: string): number {
  return parseISO(iso).getDay();
}

export function isWeekend(iso: string): boolean {
  const d = dayOfWeek(iso);
  return d === 0 || d === 6;
}

export function isWeekday(iso: string): boolean {
  return !isWeekend(iso);
}

/** True if the ISO date falls within any of the (inclusive) ranges. */
export function isWithinRanges(iso: string, ranges: DateRange[]): boolean {
  return ranges.some(
    (r) => r.start && r.end && daysBetween(r.start, iso) >= 0 && daysBetween(iso, r.end) >= 0,
  );
}

/**
 * ISO week key (e.g. "2026-W02") used to group days into weekly blocks.
 * Weeks start on Monday.
 */
export function isoWeekKey(iso: string): string {
  const date = parseISO(iso);
  // Shift so Monday = 0.
  const day = (date.getDay() + 6) % 7;
  // Thursday of this week determines the ISO year/week.
  const thursday = new Date(date);
  thursday.setDate(date.getDate() - day + 3);
  const isoYear = thursday.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const week =
    1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

const EN_GB_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EN_GB_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Format as the CSV's long en-GB form, e.g. "Monday, 5 January 2026". */
export function formatLongEnGB(iso: string): string {
  const d = parseISO(iso);
  return `${EN_GB_DAYS[d.getDay()]}, ${d.getDate()} ${EN_GB_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Parse the CSV's long en-GB form back into an ISO date. Returns "" if invalid. */
export function parseLongEnGB(value: string): string {
  // e.g. "Monday, 5 January 2026"
  const m = value.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return "";
  const day = Number(m[1]);
  const monthIdx = EN_GB_MONTHS.findIndex((mo) => mo.toLowerCase() === m[2].toLowerCase());
  const year = Number(m[3]);
  if (monthIdx < 0) return "";
  return toISO(new Date(year, monthIdx, day));
}

/** Short label for table display, e.g. "Mon 5 Jan". */
export function formatShort(iso: string): string {
  const d = parseISO(iso);
  return `${EN_GB_DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${EN_GB_MONTHS[d.getMonth()].slice(0, 3)}`;
}
