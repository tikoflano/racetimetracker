import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { TextInput, Button, Stack, Text } from '@mantine/core';
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
      <div className="register-page">
        <div className="register-card">
          <Text c="dimmed">Connecting...</Text>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="register-page">
        <div className="register-card">
          <h1>Registration Complete</h1>
          <Text mt="md">You have been registered successfully. See you at the race!</Text>
        </div>
      </div>
    );
  }

  // Org not found
  if (orgs.length > 0 && !org) {
    return (
      <div className="register-page">
        <div className="register-card">
          <h1>Organization Not Found</h1>
          <Text c="dimmed" mt="xs">
            This registration link is invalid.
          </Text>
        </div>
      </div>
    );
  }

  // Registration disabled for this org
  if (org && org.registrationEnabled === false) {
    return (
      <div className="register-page">
        <div className="register-card">
          <h1>Registration Closed</h1>
          <Text c="dimmed" mt="xs">
            Registration is currently disabled for this organization.
          </Text>
        </div>
      </div>
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
    <div className="register-page">
      <div className="register-card">
        <h1>Rider Registration</h1>
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
      </div>
    </div>
  );
}
