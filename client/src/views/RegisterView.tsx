import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { TextInput, Button, Stack, Text, Box, Paper, Title } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { tables, reducers } from '../module_bindings';
import { getErrorMessage } from '../utils';
import type { Organization } from '../module_bindings/types';

export default function RegisterView() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const connState = useSpacetimeDB();

  const [orgs] = useTable(tables.organization);

  const registerRider = useReducer(reducers.registerRiderWithOrgSlug);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  });
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const org = orgs.find((o: Organization) => o.slug === orgSlug);

  if (!connState.isActive) {
    return (
      <Box mih="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Paper withBorder p="xl" maw={440} w="100%">
          <Text c="dimmed">Connecting...</Text>
        </Paper>
      </Box>
    );
  }

  if (submitted) {
    return (
      <Box mih="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Paper withBorder p="xl" maw={440} w="100%">
          <Title order={1}>Registration Complete</Title>
          <Text mt="md">You have been registered successfully. See you at the race!</Text>
        </Paper>
      </Box>
    );
  }

  // Org not found
  if (orgs.length > 0 && !org) {
    return (
      <Box mih="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Paper withBorder p="xl" maw={440} w="100%">
          <Title order={1}>Organization Not Found</Title>
          <Text c="dimmed" mt="xs">
            This registration link is invalid.
          </Text>
        </Paper>
      </Box>
    );
  }

  // Registration disabled for this org
  if (org && org.registrationEnabled === false) {
    return (
      <Box mih="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Paper withBorder p="xl" maw={440} w="100%">
          <Title order={1}>Registration Closed</Title>
          <Text c="dimmed" mt="xs">
            Registration is currently disabled for this organization.
          </Text>
        </Paper>
      </Box>
    );
  }

  const handleSubmit = async () => {
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required');
      return;
    }
    try {
      await registerRider({
        orgSlug: orgSlug ?? '',
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth,
      });
      setSubmitted(true);
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Registration failed'));
    }
  };

  return (
    <Box mih="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Paper withBorder p="xl" maw={440} w="100%">
        <Title order={1}>Rider Registration</Title>
        {org && (
          <Text c="dimmed" mb="md">
            Register with <strong>{org.name}</strong>
          </Text>
        )}

        {error && (
          <Text size="sm" c="red" mb="sm">
            {error}
          </Text>
        )}

        <Stack gap="sm">
          <TextInput
            label="First Name *"
            placeholder="First name"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          <TextInput
            label="Last Name *"
            placeholder="Last name"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <TextInput
            label="Email"
            placeholder="email@example.com"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <TextInput
            label="Phone"
            placeholder="+1-555-0100"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <DatePickerInput
            label="Date of Birth"
            value={form.dateOfBirth ? new Date(form.dateOfBirth) : null}
            onChange={(d) => setForm((f) => ({ ...f, dateOfBirth: d ? d.toISOString().slice(0, 10) : '' }))}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <Button onClick={handleSubmit} mt="xs">
            Register
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
