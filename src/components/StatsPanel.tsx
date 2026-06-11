"use client";

import { Box, Heading, Stack, Table, Text } from "@chakra-ui/react";
import { POOLS, ROLES, type Person, type Pool, type RoleId, type RotaDay } from "@/lib/types";

interface Props {
  days: RotaDay[];
  people: Person[];
}

function rolesForPool(pool: Pool): RoleId[] {
  return ROLES.filter((r) => r.pool === pool).map((r) => r.id);
}

export function StatsPanel({ days, people }: Props) {
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Heading size="md" mb={3}>
        Distribution
      </Heading>
      <Stack gap={5}>
        {POOLS.map((pool) => {
          const members = people.filter((p) => p.pools.includes(pool));
          if (members.length === 0) return null;
          const poolRoles = rolesForPool(pool);

          // Per person, per role counts within this pool.
          const counts = new Map<string, Map<RoleId, number>>();
          for (const m of members) counts.set(m.id, new Map());
          for (const day of days) {
            for (const roleId of poolRoles) {
              const id = day.assignments[roleId];
              if (id && counts.has(id)) {
                const m = counts.get(id)!;
                m.set(roleId, (m.get(roleId) ?? 0) + 1);
              }
            }
          }

          const totalFor = (id: string) =>
            poolRoles.reduce((sum, r) => sum + (counts.get(id)?.get(r) ?? 0), 0);
          const poolTotal = members.reduce((s, m) => s + totalFor(m.id), 0);
          const showBreakdown = pool === "South Kensington";

          return (
            <Box key={pool}>
              <Heading size="sm" mb={2}>
                {pool}
              </Heading>
              <Table.Root size="sm" variant="outline">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Person</Table.ColumnHeader>
                    {showBreakdown &&
                      poolRoles.map((r) => (
                        <Table.ColumnHeader key={r} textAlign="end">
                          {ROLES.find((x) => x.id === r)!.csvHeader.replace("RLS ", "")}
                        </Table.ColumnHeader>
                      ))}
                    <Table.ColumnHeader textAlign="end">Total</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Share</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {members.map((m) => {
                    const total = totalFor(m.id);
                    const share = poolTotal > 0 ? (total / poolTotal) * 100 : 0;
                    return (
                      <Table.Row key={m.id}>
                        <Table.Cell>{m.displayName}</Table.Cell>
                        {showBreakdown &&
                          poolRoles.map((r) => (
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
