import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
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
          <p className="muted">Connecting...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="register-page">
        <div className="register-card">
          <h1>Registration Complete</h1>
          <p style={{ marginTop: 12 }}>
            You have been registered successfully. See you at the race!
          </p>
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
          <p className="muted" style={{ marginTop: 8 }}>
            This registration link is invalid.
          </p>
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
          <p className="muted" style={{ marginTop: 8 }}>
            Registration is currently disabled for this organization.
          </p>
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
          <p className="muted" style={{ marginBottom: 16 }}>
            Register with <strong>{org.name}</strong>
          </p>
        )}

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="input-label">First Name *</label>
            <input
              type="text"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
              className="input"
            />
          </div>
          <div>
            <label className="input-label">Last Name *</label>
            <input
              type="text"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="input"
            />
          </div>
          <div>
            <label className="input-label">Email</label>
            <input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="input"
            />
          </div>
          <div>
            <label className="input-label">Phone</label>
            <input
              type="tel"
              placeholder="+1-555-0100"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="input"
            />
          </div>
          <div>
            <label className="input-label">Date of Birth</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="input"
            />
          </div>
          <button className="primary" onClick={handleSubmit} style={{ marginTop: 4 }}>
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
