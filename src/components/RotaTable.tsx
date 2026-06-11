"use client";

import { Badge, Box, Heading, Table, Text } from "@chakra-ui/react";
import { SHIFTS, type Person, type ShiftId, type RotaDay, type Semester } from "@/lib/types";
import { daysBetween, formatShort, isWeekend, isWithinRanges } from "@/lib/rota/dates";

interface Props {
  days: RotaDay[];
  people: Person[];
  semester: Semester;
  onCellChange: (date: string, shiftId: ShiftId, personId: string | null) => void;
}

export function RotaTable({ days, people, semester, onCellChange }: Props) {
  if (days.length === 0) {
    return (
      <Box borderWidth="1px" borderRadius="md" p={4}>
        <Text fontSize="sm" color="gray.600">
          No rota yet. Set a semester and people, then generate — or import a CSV.
        </Text>
      </Box>
    );
  }

  const byId = new Map(people.map((p) => [p.id, p]));
  const byngStart = semester.byngStartDate || semester.startDate;
  const byngEnd = semester.byngEndDate || semester.endDate;

  const cellEnabled = (date: string, shiftId: ShiftId): boolean => {
    const shift = SHIFTS.find((r) => r.id === shiftId)!;
    if (shift.schedule === "weekend" && !isWeekend(date)) return false;
    if (shift.schedule === "weekday" && isWeekend(date)) return false;
    if (shift.id === "BYNG" && daysBetween(byngStart, date) < 0) return false;
    if (shift.id === "BYNG" && daysBetween(date, byngEnd) < 0) return false;
    return true;
  };

  const optionsFor = (date: string, shiftId: ShiftId, currentId: string | null): Person[] => {
    const shift = SHIFTS.find((r) => r.id === shiftId)!;
    const list = people.filter(
      (p) => p.roles.includes(shift.role) && !isWithinRanges(date, p.leave),
    );
    // Ensure the currently-assigned person is always shown.
    if (currentId && !list.some((p) => p.id === currentId)) {
      const cur = byId.get(currentId);
      if (cur) list.push(cur);
    }
    return list.sort((a, b) => a.displayName.localeCompare(b.displayName));
  };

  return (
    <Box borderWidth="1px" borderRadius="md" p={4} overflowX="auto">
      <Heading size="md" mb={3} px={2} pt={2}>
        Rota
      </Heading>
      <Table.Root size="sm" stickyHeader interactive>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Date</Table.ColumnHeader>
            {SHIFTS.map((r) => (
              <Table.ColumnHeader key={r.id}>{r.csvHeader}</Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {days.map((day) => {
            const weekend = isWeekend(day.date);
            return (
              <Table.Row
                key={day.date}
                bg={weekend ? "blue.100" : undefined}
                color={weekend ? "blue.900" : undefined}
              >
                <Table.Cell whiteSpace="nowrap">
                  {formatShort(day.date)}
                  {weekend && (
                    <Badge ml={2} size="xs" colorPalette="blue">
                      WE
                    </Badge>
                  )}
                </Table.Cell>
                {SHIFTS.map((shift) => {
                  const enabled = cellEnabled(day.date, shift.id);
                  const currentId = day.assignments[shift.id];
                  if (!enabled) {
                    return (
                      <Table.Cell key={shift.id} color="gray.400" textAlign="center">
                        —
                      </Table.Cell>
                    );
                  }
                  const opts = optionsFor(day.date, shift.id, currentId);
                  return (
                    <Table.Cell key={shift.id}>
                      <select
                        aria-label={`${shift.label} for ${formatShort(day.date)}`}
                        className="rota-cell-select"
                        value={currentId ?? ""}
                        onChange={(e) =>
                          onCellChange(day.date, shift.id, e.target.value || null)
                        }
                      >
                        <option value="">—</option>
                        {opts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.displayName}
                          </option>
                        ))}
                      </select>
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
