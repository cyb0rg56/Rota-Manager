"use client";

import { useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import { SemesterForm } from "@/components/SemesterForm";
import { PeoplePanel } from "@/components/PeoplePanel";
import { RotaTable } from "@/components/RotaTable";
import { StatsPanel } from "@/components/StatsPanel";
import type { Person, RoleId, RotaDay, Semester } from "@/lib/types";
import { generateRota } from "@/lib/rota/generate";
import { exportToCsv, importFromCsv } from "@/lib/rota/csv";
import { usePersistentState } from "@/lib/usePersistentState";

const EMPTY_SEMESTER: Semester = {
  name: "",
  startDate: "",
  endDate: "",
  byngStartDate: "",
};

const STORAGE_KEYS = {
  semester: "rota:semester",
  people: "rota:people",
  days: "rota:days",
} as const;

export default function Home() {
  const [semester, setSemester] = usePersistentState<Semester>(
    STORAGE_KEYS.semester,
    EMPTY_SEMESTER,
  );
  const [people, setPeople] = usePersistentState<Person[]>(
    STORAGE_KEYS.people,
    [],
  );
  const [days, setDays] = usePersistentState<RotaDay[]>(STORAGE_KEYS.days, []);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    const confirmed = window.confirm(
      "Reset all data? This will clear the semester, people, and rota.",
    );
    if (!confirmed) return;
    setSemester(EMPTY_SEMESTER);
    setPeople([]);
    setDays([]);
    setWarnings([]);
    if (typeof window !== "undefined") {
      Object.values(STORAGE_KEYS).forEach((key) =>
        window.localStorage.removeItem(key),
      );
    }
  };

  const handleGenerate = () => {
    const result = generateRota(semester, people);
    setDays(result.days);
    setWarnings(result.warnings);
  };

  const handleCellChange = (date: string, roleId: RoleId, personId: string | null) => {
    setDays((prev) =>
      prev.map((d) =>
        d.date === date
          ? { ...d, assignments: { ...d.assignments, [roleId]: personId } }
          : d,
      ),
    );
  };

  const handleExport = () => {
    const displayNameById = new Map(people.map((p) => [p.id, p.displayName]));
    const csv = exportToCsv({ days, displayNameById });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${semester.name || "rota"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const result = importFromCsv(text);
    setPeople(result.people);
    setDays(result.days);
    setSemester((prev) => ({
      name: prev.name,
      startDate: result.startDate,
      endDate: result.endDate,
      byngStartDate: result.byngStartDate,
    }));
    setWarnings([]);
  };

  return (
    <Container maxW="6xl" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
      <Stack gap={6}>
        <Box>
          <Heading size="lg">On-Call Rota Manager</Heading>
          <Text color="gray.600">
            Evenly distribute on-call shifts across people, with leave handling and
            CSV import/export.
          </Text>
        </Box>

        <SemesterForm semester={semester} onChange={setSemester} />
        <PeoplePanel people={people} onChange={setPeople} />

        <HStack gap={3} flexWrap="wrap">
          <Button colorPalette="green" onClick={handleGenerate}>
            Generate rota
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={days.length === 0}
          >
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Import CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="Import rota CSV file"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = "";
            }}
          />
          <Button variant="outline" colorPalette="red" onClick={handleReset}>
            Reset
          </Button>
        </HStack>

        {warnings.length > 0 && (
          <Box
            borderWidth="1px"
            borderColor="orange.400"
            bg="orange.100"
            color="orange.900"
            borderRadius="md"
            p={3}
          >
            <Text fontWeight={600} mb={1}>
              {warnings.length} warning{warnings.length > 1 ? "s" : ""}
            </Text>
            <Stack gap={0.5}>
              {warnings.slice(0, 20).map((w, i) => (
                <Text key={i} fontSize="sm">
                  • {w}
                </Text>
              ))}
              {warnings.length > 20 && (
                <Text fontSize="sm" color="orange.800">
                  …and {warnings.length - 20} more.
                </Text>
              )}
            </Stack>
          </Box>
        )}

        <RotaTable
          days={days}
          people={people}
          semester={semester}
          onCellChange={handleCellChange}
        />
        <StatsPanel days={days} people={people} />
      </Stack>
    </Container>
  );
}
