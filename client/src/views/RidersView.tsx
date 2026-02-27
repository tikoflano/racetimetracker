import { useState, useMemo, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { QRCodeSVG } from 'qrcode.react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrg } from '../OrgContext';
import { FontAwesomeIcon, faPen, faTrash, faEllipsisVertical, faShareNodes } from '../icons';
import { RowActionMenu } from '../components/ActionMenu';
import Modal from '../components/Modal';
import type { Rider, Organization } from '../module_bindings/types';

export default function RidersView() {
  const oid = useActiveOrg();
  const { isAuthenticated, isReady, canManageOrgEvents } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [riders] = useTable(tables.rider);

  const createRider = useReducer(reducers.createRider);
  const updateRider = useReducer(reducers.updateRider);
  const deleteRider = useReducer(reducers.deleteRider);
  const setRegistrationEnabled = useReducer(reducers.setRegistrationEnabled);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
  const [pageSize, setPageSize] = useState(() => {
    try {
      const stored = localStorage.getItem('racetimetracker-riders-page-size');
      if (stored) {
        const n = parseInt(stored, 10);
        if (PAGE_SIZE_OPTIONS.includes(n)) return n;
      }
    } catch {}
    return 10;
  });
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [registrationModalTab, setRegistrationModalTab] = useState<'url' | 'qr'>('url');
  const [ridersMenuOpen, setRidersMenuOpen] = useState(false);
  const ridersMenuRef = useRef<HTMLDivElement>(null);

  const org = orgs.find((o: Organization) => o.id === oid);
  const hasAccess = canManageOrgEvents(oid);

  const orgRiders = useMemo(() => {
    return riders
      .filter((r: Rider) => r.orgId === oid)
      .sort((a: Rider, b: Rider) =>
        `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)
      );
  }, [riders, oid]);

  const filteredRiders = useMemo(() => {
    let list = orgRiders;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r: Rider) =>
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

  const totalPages = Math.max(1, Math.ceil(filteredRiders.length / pageSize));
  const paginatedRiders = useMemo(() => {
    const start = page * pageSize;
    return filteredRiders.slice(start, start + pageSize);
  }, [filteredRiders, page, pageSize]);

  useEffect(() => {
    setPage(0);
  }, [search, ageMin, ageMax, pageSize]);

  useEffect(() => {
    if (!ridersMenuOpen) return;
    const handle = (e: MouseEvent) => {
      if (ridersMenuRef.current && !ridersMenuRef.current.contains(e.target as Node))
        setRidersMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [ridersMenuOpen]);

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
    setForm({
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      dateOfBirth: r.dateOfBirth,
    });
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

  const registrationUrl = org ? `${window.location.origin}/register/${org.slug}` : '';

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h1 style={{ marginBottom: 0 }}>
            Riders{' '}
            <span className="muted" style={{ fontSize: '1rem', fontWeight: 400 }}>
              ({orgRiders.length})
            </span>
          </h1>
          <div ref={ridersMenuRef} style={{ position: 'relative' }}>
            <button
              className="ghost small"
              onClick={() => setRidersMenuOpen((o) => !o)}
              title="Riders actions"
              style={{ fontSize: '1rem', padding: '4px 8px' }}
            >
              <FontAwesomeIcon icon={faEllipsisVertical} />
            </button>
            {ridersMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '100%',
                  marginTop: 4,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  minWidth: 200,
                  zIndex: 50,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => {
                    setRidersMenuOpen(false);
                    setRegistrationModalTab('url');
                    setRegistrationModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: 10,
                    width: '100%',
                    padding: '9px 14px',
                    border: 'none',
                    background: 'none',
                    color: 'var(--text)',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ width: 16, textAlign: 'center', flexShrink: 0 }}>
                    <FontAwesomeIcon icon={faShareNodes} />
                  </span>
                  <span>Registration link</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!showForm && (
            <button
              className="primary small"
              onClick={() => {
                setEditingId(null);
                setShowForm(true);
                setError('');
              }}
            >
              + Add Rider
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>
            {editingId !== null ? 'Edit Rider' : 'New Rider'}
          </div>
          {error && (
            <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>{error}</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="primary small" onClick={handleSubmit}>
              {editingId !== null ? 'Save' : 'Add Rider'}
            </button>
            <button className="ghost small" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search and filters */}
      {orgRiders.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            marginBottom: 16,
          }}
        >
          <div>
            <label className="input-label">Search</label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ maxWidth: 280 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div>
              <label className="input-label">Min Age</label>
              <input
                type="number"
                placeholder="—"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                className="input"
                style={{ width: 72 }}
                min={0}
              />
            </div>
            <span className="muted small-text">–</span>
            <div>
              <label className="input-label">Max Age</label>
              <input
                type="number"
                placeholder="—"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                className="input"
                style={{ width: 72 }}
                min={0}
              />
            </div>
          </div>
        </div>
      )}

      {/* Riders table */}
      {filteredRiders.length === 0 && !showForm ? (
        <div className="empty">
          {search || ageMin || ageMax
            ? 'No riders match your filters.'
            : 'No riders yet. Add one or share the registration link.'}
        </div>
      ) : (
        <>
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
              {paginatedRiders.map((r: Rider) => (
                <tr key={String(r.id)}>
                  <td>
                    {r.firstName} {r.lastName}
                  </td>
                  <td className="muted">{r.email || '—'}</td>
                  <td className="muted">{r.phone || '—'}</td>
                  <td>{r.dateOfBirth || '—'}</td>
                  <td className="muted">
                    {r.dateOfBirth
                      ? (() => {
                          const today = new Date();
                          const dob = new Date(r.dateOfBirth);
                          let age = today.getFullYear() - dob.getFullYear();
                          const m = today.getMonth() - dob.getMonth();
                          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                          return age;
                        })()
                      : '—'}
                  </td>
                  <td>
                    <RowActionMenu
                      items={[
                        { icon: faPen, label: 'Edit', onClick: () => startEdit(r) },
                        {
                          icon: faTrash,
                          label: 'Delete',
                          danger: true,
                          onClick: () => handleDelete(r),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRiders.length > PAGE_SIZE_OPTIONS[0] && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 12,
                flexWrap: 'wrap',
              }}
            >
              <button
                className="ghost small"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </button>
              <span className="muted small-text">
                Page {page + 1} of {totalPages} ({filteredRiders.length} riders)
              </span>
              <button
                className="ghost small"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label className="input-label" style={{ marginBottom: 0 }}>
                  Per page
                </label>
                <select
                  className="input"
                  value={pageSize}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setPageSize(n);
                    try {
                      localStorage.setItem('racetimetracker-riders-page-size', String(n));
                    } catch {}
                  }}
                  style={{ width: 72, padding: '6px 8px' }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </>
      )}

      {/* Registration link modal */}
      <Modal
        open={registrationModalOpen}
        onClose={() => {
          setRegistrationModalOpen(false);
          setRegistrationModalTab('url');
        }}
        title="Registration link"
      >
        <div
          style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <input
              type="checkbox"
              checked={org?.registrationEnabled !== false}
              onChange={(e) => {
                const enabled = e.target.checked;
                setRegistrationEnabled({ orgId: oid, enabled });
              }}
              style={{ accentColor: 'var(--accent)', width: 18, height: 18 }}
            />
            <span>Allow new riders to register</span>
          </label>
          {org?.registrationEnabled === false && (
            <p className="muted small-text" style={{ marginTop: 8, marginBottom: 0 }}>
              The link is disabled. Visitors will see a "Registration Closed" message.
            </p>
          )}
        </div>
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button
            className={registrationModalTab === 'url' ? 'active' : ''}
            onClick={() => setRegistrationModalTab('url')}
          >
            URL
          </button>
          <button
            className={registrationModalTab === 'qr' ? 'active' : ''}
            onClick={() => setRegistrationModalTab('qr')}
          >
            QR code
          </button>
        </div>
        {registrationModalTab === 'url' && (
          <div>
            <div className="small-text" style={{ wordBreak: 'break-all', marginBottom: 12 }}>
              <a href={registrationUrl} target="_blank" rel="noopener noreferrer">
                {registrationUrl}
              </a>
            </div>
            <button
              className="primary small"
              onClick={() => navigator.clipboard.writeText(registrationUrl)}
            >
              Copy link
            </button>
          </div>
        )}
        {registrationModalTab === 'qr' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div
              style={{
                background: 'white',
                padding: 20,
                borderRadius: 12,
                display: 'inline-block',
              }}
            >
              <QRCodeSVG value={registrationUrl} size={200} level="M" />
            </div>
            <p className="muted small-text" style={{ marginTop: 8 }}>
              Scan to open registration form
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
