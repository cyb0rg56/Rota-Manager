"use client";

import { Box, Checkbox, Heading, Input, Stack, Text } from "@chakra-ui/react";
import type { Semester } from "@/lib/types";

interface Props {
  semester: Semester;
  onChange: (next: Semester) => void;
}

function labelStyle() {
  return { fontSize: "sm", fontWeight: 600, marginBottom: "4px" } as const;
}

export function SemesterForm({ semester, onChange }: Props) {
  const set = (patch: Partial<Semester>) => onChange({ ...semester, ...patch });

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Heading size="md" mb={3}>
        Semester
      </Heading>
      <Stack direction={{ base: "column", md: "row" }} gap={4}>
        <Box flex="1">
          <Text {...labelStyle()}>Name</Text>
          <Input
            value={semester.name}
            placeholder="e.g. Spring 2026"
            onChange={(e) => set({ name: e.target.value })}
          />
        </Box>
        <Box>
          <Text {...labelStyle()}>Start date</Text>
          <Input
            type="date"
            value={semester.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
          />
        </Box>
        <Box>
          <Text {...labelStyle()}>End date</Text>
          <Input
            type="date"
            value={semester.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
          />
        </Box>
        <Box>
          <Text {...labelStyle()}>BYNG start date</Text>
          <Input
            type="date"
            value={semester.byngStartDate}
            onChange={(e) => set({ byngStartDate: e.target.value })}
          />
          <Text fontSize="xs" color="gray.600" mt={1}>
            BYNG cells stay blank before this date.
          </Text>
        </Box>
        <Box>
          <Text {...labelStyle()}>BYNG end date</Text>
          <Input
            type="date"
            value={semester.byngEndDate}
            onChange={(e) => set({ byngEndDate: e.target.value })}
          />
          <Text fontSize="xs" color="gray.600" mt={1}>
            BYNG cells stay blank after this date.
          </Text>
        </Box>
      </Stack>
      <Box mt={4}>
        <Checkbox.Root
          checked={semester.preferConsecutive}
          onCheckedChange={(e) => set({ preferConsecutive: e.checked === true })}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Prefer consecutive shifts</Checkbox.Label>
        </Checkbox.Root>
        <Text fontSize="xs" color="gray.600" mt={1}>
          Try to give each person a continuous block of on-call days instead of
          spreading them out (at most 2 primary / 3 secondary days in a row).
          Fairness and leave still take priority.
        </Text>
      </Box>
    </Box>
  );
}
