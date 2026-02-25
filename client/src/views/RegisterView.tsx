import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { RegistrationToken, Organization } from '../module_bindings/types';

export default function RegisterView() {
  const { token } = useParams<{ token: string }>();
  const connState = useSpacetimeDB();

  const [tokens] = useTable(tables.registration_token);
  const [orgs] = useTable(tables.organization);

  const registerRider = useReducer(reducers.registerRiderWithToken);

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', age: '' });
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const regToken = tokens.find((t: RegistrationToken) => t.token === token);
  const org = regToken ? orgs.find((o: Organization) => o.id === regToken.orgId) : null;

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
          <p style={{ marginTop: 12 }}>You have been registered successfully. See you at the race!</p>
        </div>
      </div>
    );
  }

  // Token not found or inactive
  if (tokens.length > 0 && (!regToken || !regToken.isActive)) {
    return (
      <div className="register-page">
        <div className="register-card">
          <h1>Invalid Link</h1>
          <p className="muted" style={{ marginTop: 8 }}>This registration link is invalid or has been deactivated.</p>
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
    const age = parseInt(form.age) || 0;
    try {
      await registerRider({
        token: token ?? '',
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        age,
      });
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || 'Registration failed');
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h1>Racer Registration</h1>
        {org && <p className="muted" style={{ marginBottom: 16 }}>Register with <strong>{org.name}</strong></p>}

        {error && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="input-label">First Name *</label>
            <input
              type="text"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
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
              onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
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
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
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
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="input"
            />
          </div>
          <div>
            <label className="input-label">Age</label>
            <input
              type="number"
              placeholder="0"
              value={form.age}
              onChange={(e) => setForm(f => ({ ...f, age: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="input"
              min={0}
            />
          </div>
          <button className="primary" onClick={handleSubmit} style={{ marginTop: 4 }}>Register</button>
        </div>
      </div>
    </div>
  );
}
