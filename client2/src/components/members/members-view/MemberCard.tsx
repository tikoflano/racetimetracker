import { Avatar, Badge, Group, Paper, Stack, Text } from "@mantine/core";
import { IconCalendarEvent, IconTrophy } from "@tabler/icons-react";
import type { MemberRow } from "./types";
import { BADGE_FULL_STYLES } from "@/components/common";
import { ROLE_COLORS, ROLE_LABELS } from "./constants";
import { ROLE_ICONS } from "./roleConstants";
import { MemberRowActions } from "./MemberRowActions";

export interface MemberCardProps {
  member: MemberRow;
  canImpersonate: boolean;
  onEditRoles: (member: MemberRow) => void;
  onImpersonate: (member: MemberRow) => void;
  onResendInvite: (member: MemberRow) => void;
  onRemove: (member: MemberRow) => void;
}

export function MemberCard({
  member,
  canImpersonate,
  onEditRoles,
  onImpersonate,
  onResendInvite,
  onRemove,
}: MemberCardProps) {
  const totalChamp = member.championshipScopes.length;
  const totalEvent = member.eventScopes.length;
  const isPending = member.status === "pending";

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <Avatar
            size="md"
            radius="xl"
            color={ROLE_COLORS[member.role]}
            variant="light"
            style={{ flexShrink: 0 }}
          >
            {member.name.slice(0, 2).toUpperCase()}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text size="sm" fw={600} style={{ lineHeight: 1.3 }}>
              {member.name}
            </Text>
            {member.email && (
              <Text
                size="xs"
                c="dimmed"
                truncate
                style={{ lineHeight: 1.3 }}
              >
                {member.email}
              </Text>
            )}
          </div>
        </Group>
        <MemberRowActions
          member={member}
          canImpersonate={canImpersonate}
          onEditRoles={onEditRoles}
          onImpersonate={onImpersonate}
          onResendInvite={onResendInvite}
          onRemove={onRemove}
        />
      </Group>

      <Stack gap={6} mt="sm">
        <Group justify="space-between" align="center">
          <Text size="xs" c="dimmed" fw={500}>
            Role
          </Text>
          <Badge
            size="sm"
            color={ROLE_COLORS[member.role]}
            variant="light"
            leftSection={ROLE_ICONS[member.role]}
            styles={BADGE_FULL_STYLES}
          >
            {ROLE_LABELS[member.role]}
          </Badge>
        </Group>
        {isPending && (
          <Group justify="space-between" align="center">
            <Text size="xs" c="dimmed" fw={500}>
              Status
            </Text>
            <Badge size="xs" color="orange" variant="light">
              Pending
            </Badge>
          </Group>
        )}
        {(totalChamp > 0 || totalEvent > 0) && (
          <Group justify="space-between" align="center">
            <Text size="xs" c="dimmed" fw={500}>
              Scopes
            </Text>
            <Group gap={4}>
              {totalChamp > 0 && (
                <Badge
                  size="xs"
                  color="blue"
                  variant="light"
                  leftSection={<IconTrophy size={10} />}
                  styles={BADGE_FULL_STYLES}
                >
                  {totalChamp}
                </Badge>
              )}
              {totalEvent > 0 && (
                <Badge
                  size="xs"
                  color="violet"
                  variant="light"
                  leftSection={<IconCalendarEvent size={10} />}
                  styles={BADGE_FULL_STYLES}
                >
                  {totalEvent}
                </Badge>
              )}
            </Group>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
