import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { QRCodeSVG } from 'qrcode.react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrg } from '../OrgContext';
import { faPen, faTrash } from '../icons';
import { RowActionMenu } from '../components/ActionMenu';
import type { Rider, Organization, RegistrationToken } from '../module_bindings/types';

export default function RidersView() {
  const oid = useActiveOrg();
  const { user, isAuthenticated, isReady, canManageOrgEvents } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [riders] = useTable(tables.rider);
  const [tokens] = useTable(tables.registration_token);

  const createRider = useReducer(reducers.createRider);
  const updateRider = useReducer(reducers.updateRider);
  const deleteRider = useReducer(reducers.deleteRider);
  const createToken = useReducer(reducers.createRegistrationToken);
  const deactivateToken = useReducer(reducers.deactivateRegistrationToken);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [expandedQR, setExpandedQR] = useState<bigint | null>(null);

  const org = orgs.find((o: Organization) => o.id === oid);
  const hasAccess = canManageOrgEvents(oid);

  const orgRiders = useMemo(() => {
    return riders
      .filter((r: Rider) => r.orgId === oid)
      .sort((a: Rider, b: Rider) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`));
  }, [riders, oid]);

  const filteredRiders = useMemo(() => {
    let list = orgRiders;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r: Rider) =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    }
    const min = parseInt(ageMin);
    const max = parseInt(ageMax);
    if (!isNaN(min) || !isNaN(max)) {
      const today = new Date();
      list = list.filter((r: Rider) => {
        if (!r.dateOfBirth) return false;
        const dob = new Date(r.dateOfBirth);
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        if (!isNaN(min) && age < min) return false;
        if (!isNaN(max) && age > max) return false;
        return true;
      });
    }
    return list;
  }, [orgRiders, search, ageMin, ageMax]);

  const orgTokens = useMemo(() => {
    return tokens.filter((t: RegistrationToken) => t.orgId === oid);
  }, [tokens, oid]);

  if (!isReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!org) {
    if (orgs.length === 0) return null;
    return <div className="empty">Organization not found.</div>;
  }
  if (!hasAccess) return <div className="empty">You don't have access to manage riders.</div>;

  const resetForm = () => {
    setForm({ firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '' });
    setError('');
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (r: Rider) => {
    setForm({ firstName: r.firstName, lastName: r.lastName, email: r.email, phone: r.phone, dateOfBirth: r.dateOfBirth });
    setEditingId(r.id);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required');
      return;
    }
    try {
      if (editingId !== null) {
        await updateRider({
          riderId: editingId,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          dateOfBirth: form.dateOfBirth,
        });
      } else {
        await createRider({
          orgId: oid,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          dateOfBirth: form.dateOfBirth,
        });
      }
      resetForm();
    } catch (e: any) {
      setError(e?.message || 'Failed to save rider');
    }
  };

  const handleDelete = async (r: Rider) => {
    if (!confirm(`Remove ${r.firstName} ${r.lastName}?`)) return;
    try {
      await deleteRider({ riderId: r.id });
    } catch (e: any) {
      setError(e?.message || 'Failed to delete rider');
    }
  };

  const handleCreateToken = async () => {
    try {
      await createToken({ orgId: oid });
    } catch (e: any) {
      setError(e?.message || 'Failed to create registration link');
    }
  };

  const handleDeactivateToken = async (tokenId: bigint) => {
    try {
      await deactivateToken({ tokenId });
    } catch (e: any) {
      setError(e?.message || 'Failed to deactivate link');
    }
  };

  const getRegistrationUrl = (token: string) => {
    return `${window.location.origin}/register/${token}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ marginBottom: 0 }}>Riders <span className="muted" style={{ fontSize: '1rem', fontWeight: 400 }}>({orgRiders.length})</span></h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {!showForm && (
            <button className="primary small" onClick={() => { setEditingId(null); setShowForm(true); setError(''); }}>+ Add Rider</button>
          )}
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>{editingId !== null ? 'Edit Rider' : 'New Rider'}</div>
          {error && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
              <label className="input-label">Date of Birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="input"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="primary small" onClick={handleSubmit}>{editingId !== null ? 'Save' : 'Add Rider'}</button>
            <button className="ghost small" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      {orgRiders.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search riders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ maxWidth: 300 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="muted small-text">Age:</span>
            <input
              type="number"
              placeholder="Min"
              value={ageMin}
              onChange={e => setAgeMin(e.target.value)}
              className="input"
              style={{ width: 70 }}
              min="0"
            />
            <span className="muted small-text">–</span>
            <input
              type="number"
              placeholder="Max"
              value={ageMax}
              onChange={e => setAgeMax(e.target.value)}
              className="input"
              style={{ width: 70 }}
              min="0"
            />
          </div>
        </div>
      )}

      {/* Riders table */}
      {filteredRiders.length === 0 && !showForm ? (
        <div className="empty">{search ? 'No riders match your search.' : 'No riders yet. Add one or generate a registration link.'}</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>DOB</th>
              <th>Age</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredRiders.map((r: Rider) => (
              <tr key={String(r.id)}>
                <td>{r.firstName} {r.lastName}</td>
                <td className="muted">{r.email || '—'}</td>
                <td className="muted">{r.phone || '—'}</td>
                <td>{r.dateOfBirth || '—'}</td>
                <td className="muted">{r.dateOfBirth ? (() => {
                  const today = new Date();
                  const dob = new Date(r.dateOfBirth);
                  let age = today.getFullYear() - dob.getFullYear();
                  const m = today.getMonth() - dob.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                  return age;
                })() : '—'}</td>
                <td>
                  <RowActionMenu items={[
                    { icon: faPen, label: 'Edit', onClick: () => startEdit(r) },
                    { icon: faTrash, label: 'Delete', danger: true, onClick: () => handleDelete(r) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Registration Links section */}
      <div className="section" style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Registration Links</div>
          <button className="primary small" onClick={handleCreateToken}>+ Generate Link</button>
        </div>
        <p className="muted small-text" style={{ marginBottom: 12 }}>
          Share these links or QR codes so riders can register themselves.
        </p>
        {orgTokens.length === 0 ? (
          <div className="empty" style={{ padding: 16 }}>No registration links yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orgTokens.map((tok: RegistrationToken) => {
              const url = getRegistrationUrl(tok.token);
              const isExpanded = expandedQR === tok.id;
              return (
                <div key={String(tok.id)} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className={`badge ${tok.isActive ? 'running' : 'finished'}`}>
                          {tok.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="small-text" style={{ wordBreak: 'break-all' }}>
                        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        className="ghost small"
                        onClick={() => { navigator.clipboard.writeText(url); }}
                        title="Copy link"
                      >
                        Copy
                      </button>
                      <button
                        className="ghost small"
                        onClick={() => setExpandedQR(isExpanded ? null : tok.id)}
                        title="Show QR code"
                      >
                        QR
                      </button>
                      {tok.isActive && (
                        <button
                          className="ghost small"
                          onClick={() => handleDeactivateToken(tok.id)}
                          style={{ color: 'var(--red)' }}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ marginTop: 12, textAlign: 'center', padding: 16 }}>
                      <div style={{ background: 'white', padding: 20, borderRadius: 12, display: 'inline-block' }}>
                        <QRCodeSVG value={url} size={200} level="M" />
                      </div>
                      <p className="muted small-text" style={{ marginTop: 8 }}>Scan to open registration form</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
