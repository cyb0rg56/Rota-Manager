// Rota generation: evenly distributes shifts across each role's people while
// honouring leave, same-day conflicts, and soft spacing preferences.

import {
  SHIFTS,
  type GenerationResult,
  type Person,
  type Role,
  type ShiftDef,
  type ShiftId,
  type RotaDay,
  type Semester,
} from "../types";
import {
  addDays,
  daysBetween,
  enumerateDays,
  isWeekend,
  isWithinRanges,
  isoWeekKey,
} from "./dates";

// Soft-constraint penalties (in "shift" units, comparable to the fairness term).
const BACK_TO_BACK_PENALTY = 1.5;
const SAME_SHIFT_ADJACENT_WEEKEND_PENALTY = 2.5;
// Tie-break nudge favouring people who have not worked recently.
const SPREAD_BONUS_PER_DAY = 0.02;
const SPREAD_BONUS_CAP = 1.0;
// Nudge towards balancing primary vs secondary within the same category
// (e.g. P-WD vs S-WD). Capped below 1.0 so it only breaks ties between people
// with equal totals rather than overriding overall fairness.
const TIER_BALANCE_WEIGHT = 0.5;
const TIER_BALANCE_CAP = 0.9;

interface GenState {
  /** Shift counts per role, keyed by person id. */
  counts: Record<Role, Map<string, number>>;
  /** Shift counts per shift, keyed by person id (for primary/secondary balance). */
  shiftCounts: Map<ShiftId, Map<string, number>>;
  /** Most recent assigned date (any shift) per person id. */
  lastDate: Map<string, string>;
}

function emptyState(): GenState {
  return {
    counts: { "South Kensington": new Map(), BYNG: new Map(), Staff: new Map(), Director: new Map() },
    shiftCounts: new Map(),
    lastDate: new Map(),
  };
}

function isAvailable(person: Person, date: string): boolean {
  return !isWithinRanges(date, person.leave);
}

/** Score a candidate for a slot; lower is better. */
function scoreCandidate(
  person: Person,
  shift: ShiftDef,
  date: string,
  state: GenState,
  byDate: Map<string, RotaDay>,
): number {
  let score = state.counts[shift.role].get(person.id) ?? 0;

  const last = state.lastDate.get(person.id);
  if (last) {
    const gap = daysBetween(last, date);
    if (gap === 1) score += BACK_TO_BACK_PENALTY;
    const bonus = Math.min(gap * SPREAD_BONUS_PER_DAY, SPREAD_BONUS_CAP);
    score -= bonus;
  }

  // Avoid the same person holding the same weekend shift on adjacent days.
  if (isWeekend(date)) {
    const prev = byDate.get(addDays(date, -1));
    if (prev && prev.assignments[shift.id] === person.id) {
      score += SAME_SHIFT_ADJACENT_WEEKEND_PENALTY;
    }
  }

  // Balance primary vs secondary within the same category: prefer the tier the
  // person has worked less. Capped so it never outweighs total fairness.
  if (shift.counterpart) {
    const mine = state.shiftCounts.get(shift.id)?.get(person.id) ?? 0;
    const theirs = state.shiftCounts.get(shift.counterpart)?.get(person.id) ?? 0;
    const imbalance = mine - theirs;
    score += Math.max(
      -TIER_BALANCE_CAP,
      Math.min(TIER_BALANCE_CAP, TIER_BALANCE_WEIGHT * imbalance),
    );
  }

  return score;
}

function pickBest(
  candidates: Person[],
  shift: ShiftDef,
  date: string,
  state: GenState,
  byDate: Map<string, RotaDay>,
): Person | null {
  let best: Person | null = null;
  let bestScore = Infinity;
  for (const p of candidates) {
    const s = scoreCandidate(p, shift, date, state, byDate);
    if (s < bestScore) {
      best = p;
      bestScore = s;
    }
  }
  return best;
}

function recordAssignment(
  state: GenState,
  role: Role,
  shiftId: ShiftId,
  personId: string,
  date: string,
): void {
  state.counts[role].set(personId, (state.counts[role].get(personId) ?? 0) + 1);
  let shiftMap = state.shiftCounts.get(shiftId);
  if (!shiftMap) {
    shiftMap = new Map();
    state.shiftCounts.set(shiftId, shiftMap);
  }
  shiftMap.set(personId, (shiftMap.get(personId) ?? 0) + 1);
  const prev = state.lastDate.get(personId);
  if (!prev || daysBetween(prev, date) > 0) {
    state.lastDate.set(personId, date);
  }
}

export function generateRota(
  semester: Semester,
  people: Person[],
): GenerationResult {
  const warnings: string[] = [];
  const days = enumerateDays(semester.startDate, semester.endDate);
  if (days.length === 0) {
    return { days: [], warnings: ["Semester date range is empty or invalid."] };
  }

  const byDate = new Map<string, RotaDay>();
  for (const date of days) {
    byDate.set(date, {
      date,
      assignments: {
        "P-WE": null,
        "S-WE": null,
        "P-WD": null,
        "S-WD": null,
        BYNG: null,
        Staff: null,
        Director: null,
      },
    });
  }

  const state = emptyState();
  const peopleByRole: Record<Role, Person[]> = {
    "South Kensington": people.filter((p) => p.roles.includes("South Kensington")),
    BYNG: people.filter((p) => p.roles.includes("BYNG")),
    Staff: people.filter((p) => p.roles.includes("Staff")),
    Director: people.filter((p) => p.roles.includes("Director")),
  };

  const byngStart = semester.byngStartDate || semester.startDate;

  const blockShifts = SHIFTS.filter((r) => r.schedule === "weekly-block");
  const dailyShifts = SHIFTS.filter((r) => r.schedule !== "weekly-block");

  // 1) Fill weekly-block shifts (Director, Staff): one person per ISO week.
  const weeks = new Map<string, string[]>();
  for (const date of days) {
    const key = isoWeekKey(date);
    const arr = weeks.get(key) ?? [];
    arr.push(date);
    weeks.set(key, arr);
  }

  for (const shift of blockShifts) {
    const candidatesPool = peopleByRole[shift.role];
    for (const [, blockDays] of weeks) {
      const pickDate = blockDays[0];
      // Prefer people available for the whole block; otherwise most-available.
      const fullyAvailable = candidatesPool.filter((p) => blockDays.every((d) => isAvailable(p, d)));
      const candidates = fullyAvailable.length > 0 ? fullyAvailable : candidatesPool;
      if (candidates.length === 0) {
        warnings.push(
          `No ${shift.label} candidates for week starting ${blockDays[0]}.`,
        );
        continue;
      }
      const chosen = pickBest(candidates, shift, pickDate, state, byDate);
      if (!chosen) continue;
      recordAssignment(state, shift.role, shift.id, chosen.id, pickDate);
      for (const d of blockDays) {
        if (isAvailable(chosen, d)) {
          byDate.get(d)!.assignments[shift.id] = chosen.id;
        }
      }
    }
  }

  // 2) Fill daily shifts chronologically, shift by shift within each day.
  for (const date of days) {
    const day = byDate.get(date)!;
    const usedToday = new Set<string>();
    // Seed with block-shift assignments already made for this day.
    for (const r of SHIFTS) {
      const id = day.assignments[r.id];
      if (id) usedToday.add(id);
    }

    for (const shift of dailyShifts) {
      if (shift.schedule === "weekend" && !isWeekend(date)) continue;
      if (shift.schedule === "weekday" && isWeekend(date)) continue;
      if (shift.id === "BYNG" && daysBetween(byngStart, date) < 0) continue;

      const candidates = peopleByRole[shift.role].filter(
        (p) => isAvailable(p, date) && !usedToday.has(p.id),
      );
      if (candidates.length === 0) {
        warnings.push(`No ${shift.label} candidate available on ${date}.`);
        continue;
      }
      const chosen = pickBest(candidates, shift, date, state, byDate);
      if (!chosen) continue;
      day.assignments[shift.id] = chosen.id;
      usedToday.add(chosen.id);
      recordAssignment(state, shift.role, shift.id, chosen.id, date);
    }
  }

  return { days: days.map((d) => byDate.get(d)!), warnings };
}

/** Aggregate per-person shift counts within a role from a set of rota days. */
export function tallyByRole(
  days: RotaDay[],
  shiftsForRole: ShiftId[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const day of days) {
    for (const shiftId of shiftsForRole) {
      const id = day.assignments[shiftId];
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}
