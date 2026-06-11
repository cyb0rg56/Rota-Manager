// iCalendar (.ics) export: one all-day VEVENT per non-null shift assignment.
// Events are titled with a short shift prefix and the person's display name,
// e.g. "SK (P) - David". Generated as plain RFC 5545 text (no dependency).

import { SHIFTS, type ShiftId } from "../types";
import { addDays } from "./dates";
import type { ExportInput } from "./csv";

/** Short title prefix shown in calendar events for each shift. */
const SHIFT_PREFIX: Record<ShiftId, string> = {
  "P-WE": "SK (P)",
  "S-WE": "SK (S)",
  "P-WD": "SK (P)",
  "S-WD": "SK (S)",
  BYNG: "BYNG",
  Staff: "Staff",
  Director: "Director",
};

/** Escape a value for use in an ICS text field (RFC 5545 §3.3.11). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

/** Convert an ISO date string (yyyy-mm-dd) to ICS DATE form (yyyymmdd). */
function toIcsDate(iso: string): string {
  return iso.replace(/-/g, "");
}

/** UTC timestamp in ICS DATE-TIME form (yyyymmddThhmmssZ) for DTSTAMP. */
function icsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function exportToIcs({ days, displayNameById }: ExportInput): string {
  const dtstamp = icsTimestamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//rota-manager//Rota Export//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const day of days) {
    const start = toIcsDate(day.date);
    const end = toIcsDate(addDays(day.date, 1));
    for (const shift of SHIFTS) {
      const personId = day.assignments[shift.id];
      if (!personId) continue;
      const name = displayNameById.get(personId) ?? "";
      const summary = `${SHIFT_PREFIX[shift.id]} - ${name}`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${day.date}-${shift.id}@rota-manager`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${start}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${escapeText(summary)}`,
        "END:VEVENT",
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
