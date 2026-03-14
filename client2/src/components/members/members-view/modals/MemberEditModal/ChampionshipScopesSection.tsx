import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { IconTrophy, IconTrash } from "@tabler/icons-react";
import type { ScopeChampionship } from "../../types";
import { BADGE_FULL_STYLES } from "@/components/common";

interface ChampionshipScopesSectionProps {
  memberScopes: ScopeChampionship[];
  availableChampionships: { id: bigint; name: string }[];
  addChampId: string | null;
  setAddChampId: (v: string | null) => void;
  addChampRole: "manager" | "timekeeper";
  setAddChampRole: (v: "manager" | "timekeeper") => void;
  loading: boolean;
  onAdd: () => void;
  onRemove: (scope: ScopeChampionship) => void;
  onUpdateRole: (scope: ScopeChampionship, role: "manager" | "timekeeper") => void;
}

export function ChampionshipScopesSection({
  memberScopes,
  availableChampionships,
  addChampId,
  setAddChampId,
  addChampRole,
  setAddChampRole,
  loading,
  onAdd,
  onRemove,
  onUpdateRole,
}: ChampionshipScopesSectionProps) {
  return (
    <Box>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
        Championship scopes
      </Text>
      <Text size="xs" c="dimmed" mb="xs">
        Grant access to specific championships. Manager: manage events, tracks,
        riders, schedule. Timekeeper: timekeeping only.
      </Text>
      {memberScopes.length > 0 && (
        <Stack gap="xs" mb="sm">
          {memberScopes.map((s) => (
            <Group key={String(s.id)} justify="space-between" wrap="nowrap">
              <Group gap="xs">
                <Badge
                  size="sm"
                  color="blue"
                  variant="light"
                  leftSection={<IconTrophy size={12} />}
                  styles={BADGE_FULL_STYLES}
                >
                  {s.championshipName}
                </Badge>
                <Select
                  value={s.role}
                  onChange={(v) =>
                    onUpdateRole(s, (v as "manager" | "timekeeper") || "manager")
                  }
                  data={[
                    { value: "manager", label: "Manager" },
                    { value: "timekeeper", label: "Timekeeper" },
                  ]}
                  size="xs"
                  style={{ width: 110 }}
                  disabled={loading}
                />
              </Group>
              <ActionIcon
                size="sm"
                color="red"
                variant="subtle"
                onClick={() => onRemove(s)}
                disabled={loading}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      )}
      {availableChampionships.length > 0 && (
        <Group gap="xs" align="center">
          <Select
            placeholder="Add championship..."
            value={addChampId}
            onChange={setAddChampId}
            data={availableChampionships.map((c) => ({
              value: String(c.id),
              label: c.name,
            }))}
            searchable
            clearable
            style={{ flex: 1 }}
          />
          <Select
            value={addChampRole}
            onChange={(v) =>
              setAddChampRole((v as "manager" | "timekeeper") || "manager")
            }
            data={[
              { value: "manager", label: "Manager" },
              { value: "timekeeper", label: "Timekeeper" },
            ]}
            style={{ width: 110 }}
          />
          <Button size="xs" onClick={onAdd} disabled={!addChampId || loading}>
            Add
          </Button>
        </Group>
      )}
      {memberScopes.length === 0 && availableChampionships.length === 0 && (
        <Text size="sm" c="dimmed">
          No championships in this org. Create one first.
        </Text>
      )}
    </Box>
  );
}
