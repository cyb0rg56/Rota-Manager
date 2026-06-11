// Domain model for the on-call rota manager.

export type Pool = "South Kensington" | "BYNG" | "Staff" | "Director";

export const POOLS: Pool[] = ["South Kensington", "BYNG", "Staff", "Director"];

export type RoleId =
  | "P-WE"
  | "S-WE"
  | "P-WD"
  | "S-WD"
  | "BYNG"
  | "Staff"
  | "Director";

/** How a role is scheduled across the calendar. */
export type RoleSchedule =
  | "weekend" // Saturday & Sunday only (one slot per weekend day)
  | "weekday" // Monday–Friday only
  | "daily" // every day (from a role-specific start date for BYNG)
  | "weekly-block"; // one person held across a whole ISO week

export interface RoleDef {
  id: RoleId;
  label: string; // human label
  csvHeader: string; // exact column header in the CSV
  pool: Pool;
  schedule: RoleSchedule;
}

/**
 * Role definitions in CSV column order.
 * Note: the source CSV labels the secondary weekday column "RLS P-WD" (a typo);
 * we keep that exact header for round-trip fidelity.
 */
export const ROLES: RoleDef[] = [
  { id: "P-WE", label: "Primary Weekend", csvHeader: "RLS P-WE", pool: "South Kensington", schedule: "weekend" },
  { id: "S-WE", label: "Secondary Weekend", csvHeader: "RLS S-WE", pool: "South Kensington", schedule: "weekend" },
  { id: "P-WD", label: "Primary Weekday", csvHeader: "RLS P-WD", pool: "South Kensington", schedule: "weekday" },
  { id: "S-WD", label: "Secondary Weekday", csvHeader: "RLS S-WD", pool: "South Kensington", schedule: "weekday" },
  { id: "BYNG", label: "Byng", csvHeader: "BYNG", pool: "BYNG", schedule: "daily" },
  { id: "Staff", label: "Staff On Call", csvHeader: "Staff", pool: "Staff", schedule: "weekly-block" },
  { id: "Director", label: "Director On Call", csvHeader: "Director", pool: "Director", schedule: "weekly-block" },
];

export const ROLE_BY_ID: Record<RoleId, RoleDef> = ROLES.reduce(
  (acc, r) => {
    acc[r.id] = r;
    return acc;
  },
  {} as Record<RoleId, RoleDef>,
);

/** Inclusive date range, stored as ISO date strings (yyyy-mm-dd). */
export interface DateRange {
  start: string;
  end: string;
}

export interface Person {
  id: string;
  /** Full name, e.g. "Lily Jennings". */
  fullName: string;
  /** Short display name used in the rota cells, e.g. "Lily J". */
  displayName: string;
  /** Pools this person can be assigned within. */
  pools: Pool[];
  /** Leave periods; the person is excluded from all roles during these. */
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
}

/** A single day in the rota with its role assignments (person ids or null). */
export interface RotaDay {
  /** ISO date (yyyy-mm-dd). */
  date: string;
  assignments: Record<RoleId, string | null>;
}

export interface GenerationResult {
  days: RotaDay[];
  /** Human-readable warnings, e.g. slots that could not be filled. */
  warnings: string[];
}
