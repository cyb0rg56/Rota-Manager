// CSV import/export matching the exact column layout of the source rota file:
// Date,End Date,All-Day,RLS P-WE,RLS S-WE,RLS P-WD,RLS S-WD,BYNG,Staff,Director

import {
  SHIFTS,
  type Person,
  type Role,
  type ShiftDef,
  type RotaDay,
} from "../types";
import { addDays, formatLongEnGB, parseLongEnGB } from "./dates";

const CORE_HEADERS = [
  "Date",
  "End Date",
  "All-Day",
  ...SHIFTS.map((r) => r.csvHeader),
];

function escapeField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export interface ExportInput {
  days: RotaDay[];
  /** Map of person id -> display name for rendering cell values. */
  displayNameById: Map<string, string>;
}

/**
 * Build the rota as a grid of string cells (header row first), shared by the
 * CSV and Excel exporters so both formats stay perfectly in sync.
 */
export function buildRotaRows({ days, displayNameById }: ExportInput): string[][] {
  const rows: string[][] = [CORE_HEADERS.slice()];
  for (const day of days) {
    rows.push([
      formatLongEnGB(day.date),
      formatLongEnGB(addDays(day.date, 1)),
      "Y",
      ...SHIFTS.map((r) => {
        const id = day.assignments[r.id];
        return id ? (displayNameById.get(id) ?? "") : "";
      }),
    ]);
  }
  return rows;
}

export function exportToCsv(input: ExportInput): string {
  return buildRotaRows(input)
    .map((row) => row.map(escapeField).join(","))
    .join("\n");
}

/** Parse a single CSV line into fields, honouring quoted fields. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

export interface ImportResult {
  people: Person[];
  days: RotaDay[];
  startDate: string;
  endDate: string;
  byngStartDate: string;
  byngEndDate: string;
}

let importIdCounter = 0;
function nextId(): string {
  importIdCounter += 1;
  return `imp-${importIdCounter}`;
}

/**
 * Parse a grid of string cells (header row first) back into people (by display
 * name) and rota days. Shared by the CSV and Excel importers.
 * Display names appearing in a shift column are added to that shift's role.
 */
export function parseRotaRows(rows: string[][]): ImportResult {
  const dataRows = rows.filter((r) => r.some((c) => (c ?? "").trim().length > 0));
  if (dataRows.length === 0) {
    return { people: [], days: [], startDate: "", endDate: "", byngStartDate: "", byngEndDate: "" };
  }

  const header = dataRows[0];
  // Map each shift to its column index by matching the exact header text.
  const shiftColumn = new Map<ShiftDef, number>();
  for (const shift of SHIFTS) {
    const idx = header.findIndex((h) => (h ?? "").trim() === shift.csvHeader);
    if (idx >= 0) shiftColumn.set(shift, idx);
  }
  const dateIdx = header.findIndex((h) => (h ?? "").trim() === "Date");

  const idByName = new Map<string, string>();
  const rolesByName = new Map<string, Set<Role>>();
  const days: RotaDay[] = [];
  let byngStartDate = "";
  let byngEndDate = "";

  function ensurePerson(name: string, role: Role): string {
    const key = name.trim();
    let id = idByName.get(key);
    if (!id) {
      id = nextId();
      idByName.set(key, id);
      rolesByName.set(key, new Set());
    }
    rolesByName.get(key)!.add(role);
    return id;
  }

  for (let i = 1; i < dataRows.length; i++) {
    const fields = dataRows[i];
    const iso = dateIdx >= 0 ? parseLongEnGB(fields[dateIdx] ?? "") : "";
    if (!iso) continue; // skip stat/blank rows that have no valid date

    const assignments: RotaDay["assignments"] = {
      "P-WE": null,
      "S-WE": null,
      "P-WD": null,
      "S-WD": null,
      BYNG: null,
      Staff: null,
      Director: null,
    };

    for (const [shift, col] of shiftColumn) {
      const value = (fields[col] ?? "").trim();
      if (!value) continue;
      const id = ensurePerson(value, shift.role);
      assignments[shift.id] = id;
      if (shift.id === "BYNG" && (!byngStartDate || iso < byngStartDate)) {
        byngStartDate = iso;
      }
      if (shift.id === "BYNG" && (!byngEndDate || iso > byngEndDate)) {
        byngEndDate = iso;
      }
    }

    days.push({ date: iso, assignments });
  }

  const people: Person[] = [...idByName.entries()].map(([name, id]) => ({
    id,
    fullName: name,
    displayName: name,
    roles: [...(rolesByName.get(name) ?? new Set<Role>())],
    leave: [],
  }));

  const dates = days.map((d) => d.date).sort();
  return {
    people,
    days,
    startDate: dates[0] ?? "",
    endDate: dates[dates.length - 1] ?? "",
    byngStartDate,
    byngEndDate,
  };
}

/**
 * Parse a CSV string back into people (by display name) and rota days.
 */
export function importFromCsv(text: string): ImportResult {
  const rows = text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map(parseCsvLine);
  return parseRotaRows(rows);
}
