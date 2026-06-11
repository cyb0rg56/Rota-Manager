// Domain model for the on-call rota manager.

export type Role = "South Kensington" | "BYNG" | "Staff" | "Director";

export const ROLES: Role[] = ["South Kensington", "BYNG", "Staff", "Director"];

export type ShiftId =
  | "P-WE"
  | "S-WE"
  | "P-WD"
  | "S-WD"
  | "BYNG"
  | "Staff"
  | "Director";

/** How a shift is scheduled across the calendar. */
export type ShiftSchedule =
  | "weekend" // Saturday & Sunday only (one slot per weekend day)
  | "weekday" // Monday–Friday only
  | "daily" // every day (from a shift-specific start date for BYNG)
  | "weekly-block"; // one person held across a whole ISO week

export interface ShiftDef {
  id: ShiftId;
  label: string; // human label
  csvHeader: string; // exact column header in the CSV
  role: Role;
  schedule: ShiftSchedule;
  /**
   * Opposite tier in the same category (e.g. primary <-> secondary for the
   * same weekday/weekend slot). Used to balance how often a person works the
   * primary vs secondary shift. Undefined for single-tier shifts.
   */
  counterpart?: ShiftId;
}

/**
 * Shift definitions in CSV column order.
 * Note: the source CSV labels the secondary weekday column "RLS P-WD" (a typo);
 * we keep that exact header for round-trip fidelity.
 */
export const SHIFTS: ShiftDef[] = [
  { id: "P-WE", label: "Primary Weekend", csvHeader: "RLS P-WE", role: "South Kensington", schedule: "weekend", counterpart: "S-WE" },
  { id: "S-WE", label: "Secondary Weekend", csvHeader: "RLS S-WE", role: "South Kensington", schedule: "weekend", counterpart: "P-WE" },
  { id: "P-WD", label: "Primary Weekday", csvHeader: "RLS P-WD", role: "South Kensington", schedule: "weekday", counterpart: "S-WD" },
  { id: "S-WD", label: "Secondary Weekday", csvHeader: "RLS S-WD", role: "South Kensington", schedule: "weekday", counterpart: "P-WD" },
  { id: "BYNG", label: "Byng", csvHeader: "BYNG", role: "BYNG", schedule: "daily" },
  { id: "Staff", label: "Staff On Call", csvHeader: "Staff", role: "Staff", schedule: "weekly-block" },
  { id: "Director", label: "Director On Call", csvHeader: "Director", role: "Director", schedule: "weekly-block" },
];

export const SHIFT_BY_ID: Record<ShiftId, ShiftDef> = SHIFTS.reduce(
  (acc, r) => {
    acc[r.id] = r;
    return acc;
  },
  {} as Record<ShiftId, ShiftDef>,
);

/** Inclusive date range, stored as ISO date strings (yyyy-mm-dd). */
export interface DateRange {
  start: string;
  end: string;
}

export interface Person {
  id: string;
  /** Full name */
  fullName: string;
  /** Short display name used in the rota cells */
  displayName: string;
  /** Roles this person can be assigned within. */
  roles: Role[];
  /** Leave periods; the person is excluded from all shifts during these. */
  leave: DateRange[];
}

export interface Semester {
  name: string;
  /** ISO date (yyyy-mm-dd) of the first day. */
  startDate: string;
  /** ISO date (yyyy-mm-dd) of the last day. */
  endDate: string;
  /**
   * BYNG term typically starts later; BYNG cells stay blank before this date.
   * Empty string means "same as semester start".
   */
  byngStartDate: string;
  /**
   * BYNG term typically ends earlier; BYNG cells stay blank after this date.
   * Empty string means "same as semester end".
   */
  byngEndDate: string;
}

/** A single day in the rota with its shift assignments (person ids or null). */
export interface RotaDay {
  /** ISO date (yyyy-mm-dd). */
  date: string;
  assignments: Record<ShiftId, string | null>;
}

export interface GenerationResult {
  days: RotaDay[];
  /** Human-readable warnings, e.g. slots that could not be filled. */
  warnings: string[];
}
