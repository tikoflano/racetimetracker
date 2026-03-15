import { Badge, Box, Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { IconInfoCircle, IconUsers } from '@tabler/icons-react';
import type { Championship, Event } from '@/module_bindings/types';
import { ModalHeader, modalHeaderStyles, ModalFooter } from '@/components/common';
import type { MemberRow, MemberEditModalReducers } from '../../types';
import { BADGE_FULL_STYLES } from '@/components/common';
import { RolesPermissionsModal } from '../RolesPermissionsModal';
import { useMemberEditForm } from './useMemberEditForm';
import { ChampionshipScopesSection } from './ChampionshipScopesSection';
import { EventScopesSection } from './EventScopesSection';

export interface MemberEditModalProps {
  member: MemberRow;
  championships: Championship[];
  events: Event[];
  onClose: () => void;
  reducers: MemberEditModalReducers;
}

export function MemberEditModal({
  member,
  championships,
  events,
  onClose,
  reducers,
}: MemberEditModalProps) {
  const form = useMemberEditForm({
    member,
    championships,
    events,
    onClose,
    reducers,
  });

  return (
    <>
      <Modal
        opened
        onClose={onClose}
        title={
          <ModalHeader
            icon={<IconUsers size={20} />}
            iconColor="green"
            label="Permissions"
            title="Edit roles & scopes"
          />
        }
        size="lg"
        centered
        radius="md"
        overlayProps={{ blur: 3 }}
        styles={modalHeaderStyles('linear-gradient(135deg, #1a3a2a 0%, #1e5c3a 60%, #237a4b 100%)')}
      >
        <Stack gap="lg" pt="xs">
          {form.scopeError && (
            <Text size="sm" c="red">
              {form.scopeError}
            </Text>
          )}

          <Box>
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
              Organization role
            </Text>
            {member.role === 'owner' ? (
              <Badge color="green" variant="light" size="lg" styles={BADGE_FULL_STYLES}>
                Owner (full access)
              </Badge>
            ) : (
              <Group gap="xs" align="flex-start">
                <Select
                  value={form.role}
                  onChange={(v) =>
                    form.setRole((v as 'admin' | 'manager' | 'timekeeper') || 'manager')
                  }
                  data={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'timekeeper', label: 'Timekeeper' },
                  ]}
                  style={{ width: 140 }}
                />
                {form.role !== member.role && (
                  <Button size="xs" loading={form.loading} onClick={form.handleSaveRole}>
                    Save role
                  </Button>
                )}
              </Group>
            )}
          </Box>

          <ChampionshipScopesSection
            memberScopes={member.championshipScopes}
            availableChampionships={form.availableChampionships}
            addChampId={form.addChampId}
            setAddChampId={form.setAddChampId}
            addChampRole={form.addChampRole}
            setAddChampRole={form.setAddChampRole}
            loading={form.loading}
            onAdd={form.handleAddChampionship}
            onRemove={form.handleRemoveChampionship}
            onUpdateRole={form.handleUpdateChampionshipRole}
          />

          <EventScopesSection
            memberScopes={member.eventScopes}
            availableEvents={form.availableEvents}
            addEventId={form.addEventId}
            setAddEventId={form.setAddEventId}
            addEventRole={form.addEventRole}
            setAddEventRole={form.setAddEventRole}
            loading={form.loading}
            onAdd={form.handleAddEvent}
            onRemove={form.handleRemoveEvent}
            onUpdateRole={form.handleUpdateEventRole}
          />

          <ModalFooter
            left={
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconInfoCircle size={14} />}
                onClick={() => form.setInfoModalOpen(true)}
              >
                More information
              </Button>
            }
            onCancel={onClose}
            onlySubmit
            submitLabel="Save"
            onSubmit={onClose}
          />
        </Stack>
      </Modal>
      <RolesPermissionsModal
        opened={form.infoModalOpen}
        onClose={() => form.setInfoModalOpen(false)}
      />
    </>
  );
}
