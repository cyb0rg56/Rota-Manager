// CSV import/export matching the exact column layout of the source rota file:
// Date,End Date,All-Day,RLS P-WE,RLS S-WE,RLS P-WD,RLS S-WD,BYNG,Staff,Director

import {
  ROLES,
  type Person,
  type Pool,
  type RoleDef,
  type RotaDay,
} from "../types";
import { addDays, formatLongEnGB, parseLongEnGB } from "./dates";

const CORE_HEADERS = [
  "Date",
  "End Date",
  "All-Day",
  ...ROLES.map((r) => r.csvHeader),
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

export function exportToCsv({ days, displayNameById }: ExportInput): string {
  const lines: string[] = [CORE_HEADERS.join(",")];
  for (const day of days) {
    const cells = [
      formatLongEnGB(day.date),
      formatLongEnGB(addDays(day.date, 1)),
      "Y",
      ...ROLES.map((r) => {
        const id = day.assignments[r.id];
        return id ? (displayNameById.get(id) ?? "") : "";
      }),
    ];
    lines.push(cells.map(escapeField).join(","));
  }
  return lines.join("\n");
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
}

let importIdCounter = 0;
function nextId(): string {
  importIdCounter += 1;
  return `imp-${importIdCounter}`;
}

/**
 * Parse a CSV string back into people (by display name) and rota days.
 * Display names appearing in a role column are added to that role's pool.
 */
export function importFromCsv(text: string): ImportResult {
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) {
    return { people: [], days: [], startDate: "", endDate: "", byngStartDate: "" };
  }

  const header = parseCsvLine(rawLines[0]);
  // Map each role to its column index by matching the exact header text.
  const roleColumn = new Map<RoleDef, number>();
  for (const role of ROLES) {
    const idx = header.findIndex((h) => h.trim() === role.csvHeader);
    if (idx >= 0) roleColumn.set(role, idx);
  }
  const dateIdx = header.findIndex((h) => h.trim() === "Date");

  const idByName = new Map<string, string>();
  const poolsByName = new Map<string, Set<Pool>>();
  const days: RotaDay[] = [];
  let byngStartDate = "";

  function ensurePerson(name: string, pool: Pool): string {
    const key = name.trim();
    let id = idByName.get(key);
    if (!id) {
      id = nextId();
      idByName.set(key, id);
      poolsByName.set(key, new Set());
    }
    poolsByName.get(key)!.add(pool);
    return id;
  }

  for (let i = 1; i < rawLines.length; i++) {
    const fields = parseCsvLine(rawLines[i]);
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

    for (const [role, col] of roleColumn) {
      const value = (fields[col] ?? "").trim();
      if (!value) continue;
      const id = ensurePerson(value, role.pool);
      assignments[role.id] = id;
      if (role.id === "BYNG" && (!byngStartDate || iso < byngStartDate)) {
        byngStartDate = iso;
      }
    }

    days.push({ date: iso, assignments });
  }

  const people: Person[] = [...idByName.entries()].map(([name, id]) => ({
    id,
    fullName: name,
    displayName: name,
    pools: [...(poolsByName.get(name) ?? new Set<Pool>())],
    leave: [],
  }));

  const dates = days.map((d) => d.date).sort();
  return {
    people,
    days,
    startDate: dates[0] ?? "",
    endDate: dates[dates.length - 1] ?? "",
    byngStartDate,
  };
}
