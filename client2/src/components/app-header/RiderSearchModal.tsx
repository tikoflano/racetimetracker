import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Modal, Stack, Text, TextInput, ScrollArea } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useTable } from 'spacetimedb/react';
import { tables } from '@/module_bindings';
import type { Rider } from '@/module_bindings/types';
import { useActiveOrgFromOrgs } from '@/providers/OrgProvider';
import { ModalHeader, modalHeaderStyles } from '@/components/common';

interface RiderSearchModalProps {
  opened: boolean;
  onClose: () => void;
}

const DEBOUNCE_MS = 180;

export function RiderSearchModal({ opened, onClose }: RiderSearchModalProps) {
  const navigate = useNavigate();
  const [orgs] = useTable(tables.organization);
  const [allRiders] = useTable(tables.rider);
  const activeOrg = useActiveOrgFromOrgs(orgs);
  const activeOrgId = activeOrg?.id ?? null;

  const orgRiders = useMemo<Rider[]>(() => {
    if (!activeOrgId) return [];
    return (allRiders as Rider[]).filter((r) => r.orgId === activeOrgId);
  }, [allRiders, activeOrgId]);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const filteredRiders = useMemo<Rider[]>(() => {
    if (!debouncedQuery) return orgRiders;
    return orgRiders.filter(
      (r) =>
        r.firstName.toLowerCase().includes(debouncedQuery) ||
        r.lastName.toLowerCase().includes(debouncedQuery) ||
        r.email.toLowerCase().includes(debouncedQuery)
    );
  }, [orgRiders, debouncedQuery]);

  const handleRiderClick = (r: Rider) => {
    navigate('/riders', { state: { scrollToRiderId: r.id } });
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <ModalHeader
          icon={<IconSearch size={20} />}
          iconColor="blue"
          label="Search"
          title="Find rider"
        />
      }
      centered
      radius="md"
      size="md"
      overlayProps={{ blur: 3 }}
      styles={modalHeaderStyles()}
    >
      <Stack gap="md" pt="xs">
        {!activeOrg ? (
          <Text size="sm" c="dimmed">
            Select an organization to search riders.
          </Text>
        ) : (
          <>
            <TextInput
              placeholder="Search by name or email..."
              leftSection={<IconSearch size={16} />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              autoFocus
            />
            <ScrollArea.Autosize mah={320}>
              {filteredRiders.length === 0 ? (
                <Text size="sm" c="dimmed" py="sm">
                  {query.trim()
                    ? 'No riders match your search.'
                    : 'No riders in this organization yet.'}
                </Text>
              ) : (
                <Stack gap={0}>
                  {filteredRiders.map((r) => (
                    <Box
                      key={String(r.id)}
                      component="button"
                      type="button"
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        textAlign: 'left',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: 'var(--mantine-radius-sm)',
                      }}
                      onClick={() => handleRiderClick(r)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleRiderClick(r);
                        }
                      }}
                    >
                      <Text size="sm" fw={500}>
                        {r.firstName} {r.lastName}
                      </Text>
                      {r.email && (
                        <Text size="xs" c="dimmed" truncate>
                          {r.email}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </ScrollArea.Autosize>
          </>
        )}
      </Stack>
    </Modal>
  );
}
