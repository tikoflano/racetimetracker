import { Badge, Button, Stack } from "@mantine/core";
import type { MemberRole } from "./types";
import type { RoleCounts } from "./types";
import { BADGE_FULL_STYLES } from "@/components/common";
import { ROLE_COLORS, ROLE_LABELS } from "./constants";
import { ROLE_ICONS } from "./roleConstants";

const ROLES: MemberRole[] = ["owner", "admin", "manager", "timekeeper"];

export interface MembersFilterBadgesProps {
  roleFilters: string[];
  roleCounts: RoleCounts;
  onToggleRole: (role: MemberRole) => void;
  onClearFilters: () => void;
}

export function MembersFilterBadges({
  roleFilters,
  roleCounts,
  onToggleRole,
  onClearFilters,
}: MembersFilterBadgesProps) {
  return (
    <Stack gap="xs">
      {ROLES.map((r) => {
        const selected = roleFilters.includes(r);
        return (
          <Badge
            key={r}
            size="lg"
            color={ROLE_COLORS[r]}
            variant={selected ? "filled" : "light"}
            leftSection={ROLE_ICONS[r]}
            styles={BADGE_FULL_STYLES}
            style={{ cursor: "pointer" }}
            onClick={() =>
              onToggleRole(r)
            }
          >
            {ROLE_LABELS[r]} ({roleCounts[r]})
          </Badge>
        );
      })}
      {roleFilters.length > 0 && (
        <Button
          variant="subtle"
          size="xs"
          mt="xs"
          fullWidth
          onClick={onClearFilters}
        >
          Clear filters
        </Button>
      )}
    </Stack>
  );
}
