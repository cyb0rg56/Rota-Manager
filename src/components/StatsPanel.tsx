"use client";

import { Box, Heading, Stack, Table, Text } from "@chakra-ui/react";
import { ROLES, SHIFTS, type Person, type Role, type ShiftId, type RotaDay } from "@/lib/types";

interface Props {
  days: RotaDay[];
  people: Person[];
}

function shiftsForRole(role: Role): ShiftId[] {
  return SHIFTS.filter((r) => r.role === role).map((r) => r.id);
}

export function StatsPanel({ days, people }: Props) {
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Heading size="md" mb={3}>
        Distribution
      </Heading>
      <Stack gap={5}>
        {ROLES.map((role) => {
          const members = people.filter((p) => p.roles.includes(role));
          if (members.length === 0) return null;
          const roleShifts = shiftsForRole(role);

          // Per person, per shift counts within this role.
          const counts = new Map<string, Map<ShiftId, number>>();
          for (const m of members) counts.set(m.id, new Map());
          for (const day of days) {
            for (const shiftId of roleShifts) {
              const id = day.assignments[shiftId];
              if (id && counts.has(id)) {
                const m = counts.get(id)!;
                m.set(shiftId, (m.get(shiftId) ?? 0) + 1);
              }
            }
          }

          const totalFor = (id: string) =>
            roleShifts.reduce((sum, r) => sum + (counts.get(id)?.get(r) ?? 0), 0);
          const roleTotal = members.reduce((s, m) => s + totalFor(m.id), 0);
          const showBreakdown = role === "South Kensington";

          return (
            <Box key={role}>
              <Heading size="sm" mb={2}>
                {role}
              </Heading>
              <Table.Root size="sm" variant="outline">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Person</Table.ColumnHeader>
                    {showBreakdown &&
                      roleShifts.map((r) => (
                        <Table.ColumnHeader key={r} textAlign="end">
                          {SHIFTS.find((x) => x.id === r)!.csvHeader.replace("RLS ", "")}
                        </Table.ColumnHeader>
                      ))}
                    <Table.ColumnHeader textAlign="end">Total</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Share</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {members.map((m) => {
                    const total = totalFor(m.id);
                    const share = roleTotal > 0 ? (total / roleTotal) * 100 : 0;
                    return (
                      <Table.Row key={m.id}>
                        <Table.Cell>{m.displayName}</Table.Cell>
                        {showBreakdown &&
                          roleShifts.map((r) => (
                            <Table.Cell key={r} textAlign="end">
                              {counts.get(m.id)?.get(r) ?? 0}
                            </Table.Cell>
                          ))}
                        <Table.Cell textAlign="end" fontWeight={600}>
                          {total}
                        </Table.Cell>
                        <Table.Cell textAlign="end">{fmtPct(share)}</Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            </Box>
          );
        })}
        {people.length === 0 && (
          <Text fontSize="sm" color="gray.600">
            Add people and generate a rota to see distribution.
          </Text>
        )}
      </Stack>
    </Box>
  );
}
