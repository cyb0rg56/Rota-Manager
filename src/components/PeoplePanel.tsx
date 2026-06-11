"use client";

import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ROLES, type DateRange, type Person, type Role } from "@/lib/types";

interface Props {
  people: Person[];
  onChange: (people: Person[]) => void;
}

const ROLE_LABELS: Record<Role, string> = {
  "South Kensington": "South Kensington",
  BYNG: "BYNG",
  Staff: "Staff",
  Director: "Director",
};

function makeId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function deriveDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}`;
}

export function PeoplePanel({ people, onChange }: Props) {
  const [newName, setNewName] = useState("");

  const addPerson = () => {
    const fullName = newName.trim();
    if (!fullName) return;
    const person: Person = {
      id: makeId(),
      fullName,
      displayName: deriveDisplayName(fullName),
      roles: [],
      leave: [],
    };
    onChange([...people, person]);
    setNewName("");
  };

  const update = (id: string, patch: Partial<Person>) =>
    onChange(people.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const remove = (id: string) => onChange(people.filter((p) => p.id !== id));

  const toggleRole = (person: Person, role: Role) => {
    const has = person.roles.includes(role);
    const roles = has ? [] : [role];
    update(person.id, { roles });
  };

  const addLeave = (person: Person) =>
    update(person.id, { leave: [...person.leave, { start: "", end: "" }] });

  const setLeave = (person: Person, index: number, patch: Partial<DateRange>) => {
    const leave = person.leave.map((r, i) => (i === index ? { ...r, ...patch } : r));
    update(person.id, { leave });
  };

  const removeLeave = (person: Person, index: number) =>
    update(person.id, { leave: person.leave.filter((_, i) => i !== index) });

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Heading size="md" mb={3}>
        People ({people.length})
      </Heading>

      <HStack mb={4}>
        <Input
          value={newName}
          placeholder="Full name"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addPerson();
          }}
        />
        <Button onClick={addPerson} colorPalette="blue">
          Add
        </Button>
      </HStack>

      <Stack gap={3}>
        {people.map((person) => (
          <Box key={person.id} borderWidth="1px" borderRadius="md" p={3}>
            <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
              <HStack gap={2} flexWrap="wrap">
                <Input
                  size="sm"
                  width="200px"
                  value={person.fullName}
                  onChange={(e) =>
                    update(person.id, { fullName: e.target.value })
                  }
                />
                <Text fontSize="sm" color="gray.600">
                  shows as
                </Text>
                <Input
                  size="sm"
                  width="110px"
                  value={person.displayName}
                  onChange={(e) =>
                    update(person.id, { displayName: e.target.value })
                  }
                />
              </HStack>
              <Button
                size="xs"
                variant="outline"
                colorPalette="red"
                onClick={() => remove(person.id)}
              >
                Remove
              </Button>
            </HStack>

            <Text fontSize="xs" fontWeight={600} color="gray.600" mb={1}>
              ROLES
            </Text>
            <HStack gap={3} flexWrap="wrap" mb={2}>
              {ROLES.map((role) => {
                const active = person.roles.includes(role);
                return (
                  <HStack key={role} gap={1}>
                    <Badge
                      as="button"
                      onClick={() => toggleRole(person, role)}
                      colorPalette={active ? "blue" : "gray"}
                      variant={active ? "solid" : "outline"}
                      cursor="pointer"
                    >
                      {ROLE_LABELS[role]}
                    </Badge>
                  </HStack>
                );
              })}
            </HStack>

            <HStack justify="space-between" mb={1}>
              <Text fontSize="xs" fontWeight={600} color="gray.600">
                LEAVE
              </Text>
              <Button size="xs" variant="ghost" onClick={() => addLeave(person)}>
                + Add leave
              </Button>
            </HStack>
            <Stack gap={2}>
              {person.leave.map((range, i) => (
                <HStack key={i} gap={2}>
                  <Input
                    size="sm"
                    type="date"
                    value={range.start}
                    onChange={(e) =>
                      setLeave(person, i, { start: e.target.value })
                    }
                  />
                  <Text fontSize="sm">to</Text>
                  <Input
                    size="sm"
                    type="date"
                    value={range.end}
                    onChange={(e) => setLeave(person, i, { end: e.target.value })}
                  />
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="red"
                    onClick={() => removeLeave(person, i)}
                  >
                    ✕
                  </Button>
                </HStack>
              ))}
            </Stack>
          </Box>
        ))}
        {people.length === 0 && (
          <Text fontSize="sm" color="gray.600">
            No people yet. Add names above, or import a CSV.
          </Text>
        )}
      </Stack>
    </Box>
  );
}
