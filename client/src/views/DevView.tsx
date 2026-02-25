import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrgMaybe } from '../OrgContext';
import { IS_DEV } from '../env';
import type { Organization, User } from '../module_bindings/types';

export default function DevView() {
  const { isAuthenticated, isReady } = useAuth();
  const activeOrgId = useActiveOrgMaybe();
  const seedDemoData = useReducer(reducers.seedDemoData);
  const wipeAllData = useReducer(reducers.wipeAllData);
  const transferOwnership = useReducer(reducers.transferOrgOwnershipByEmail);

  const [orgs] = useTable(tables.organization);
  const [users] = useTable(tables.user);

  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [wipeStatus, setWipeStatus] = useState<string | null>(null);
  const [wipeConfirm, setWipeConfirm] = useState(false);

  const [transferOrgId, setTransferOrgId] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [transferStatus, setTransferStatus] = useState<string | null>(null);

  const sortedOrgs = useMemo(() =>
    [...orgs].sort((a: Organization, b: Organization) => a.name.localeCompare(b.name)),
  [orgs]);

  if (!IS_DEV) return <Navigate to="/" replace />;
  if (!isReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  const handleSeed = async () => {
    setSeedStatus('Wiping data...');
    try {
      await wipeAllData();
      setSeedStatus('Seeding demo data...');
      await seedDemoData();
      setSeedStatus('Done! Signing out...');
      setTimeout(() => {
        localStorage.clear();
        window.location.href = '/';
      }, 1000);
    } catch (e: any) {
      setSeedStatus(`Error: ${e?.message || 'Failed to seed data'}`);
    }
  };

  const handleWipe = async () => {
    setWipeStatus(null);
    try {
      await wipeAllData();
      setWipeConfirm(false);
      setWipeStatus('All data wiped. You will be signed out.');
      setTimeout(() => {
        localStorage.clear();
        window.location.href = '/';
      }, 1500);
    } catch (e: any) {
      setWipeStatus(`Error: ${e?.message || 'Failed to wipe data'}`);
    }
  };

  const handleTransfer = async () => {
    setTransferStatus(null);
    const oid = BigInt(transferOrgId || '0');
    if (!oid) { setTransferStatus('Error: Select an organization'); return; }
    if (!transferEmail.trim()) { setTransferStatus('Error: Enter an email'); return; }
    try {
      await transferOwnership({ orgId: oid, email: transferEmail.trim() });
      setTransferStatus('Ownership transferred successfully.');
      setTransferEmail('');
    } catch (e: any) {
      setTransferStatus(`Error: ${e?.message || 'Failed to transfer'}`);
    }
  };

  return (
    <div>
      <h1>Developer Tools</h1>
      <p className="muted small-text" style={{ marginBottom: 20 }}>
        These tools are only available in development mode.
      </p>

      {/* Seed */}
      <div className="section">
        <div className="section-title">Reset &amp; Seed Demo Data</div>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="muted small-text">Wipes all existing data, then creates sample championships, venues, events, riders, and org members. You will be logged out afterwards.</div>
          </div>
          <button className="primary" onClick={handleSeed} style={{ whiteSpace: 'nowrap' }}>Reset &amp; Seed</button>
        </div>
        <StatusMessage status={seedStatus} />
      </div>

      {/* Transfer ownership */}
      <div className="section">
        <div className="section-title">Transfer Organization Ownership</div>
        <div className="card">
          <div className="muted small-text" style={{ marginBottom: 12 }}>Transfer ownership to any user by email. No permission checks.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={transferOrgId}
              onChange={e => setTransferOrgId(e.target.value)}
              style={{
                flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.875rem',
              }}
            >
              <option value="">Select organization...</option>
              {sortedOrgs.map((o: Organization) => (
                <option key={String(o.id)} value={String(o.id)}>{o.name}</option>
              ))}
            </select>
            <input
              type="email"
              placeholder="New owner email"
              value={transferEmail}
              onChange={e => setTransferEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTransfer()}
              style={{
                flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.875rem',
              }}
            />
            <button className="primary" onClick={handleTransfer}>Transfer</button>
          </div>
          <StatusMessage status={transferStatus} />
        </div>
      </div>

      {/* Wipe */}
      <div className="section">
        <div className="section-title">Wipe All Data</div>
        <div className="card">
          <div className="muted small-text" style={{ marginBottom: 12 }}>Deletes all rows from every table. You will be signed out.</div>
          {!wipeConfirm ? (
            <button
              onClick={() => setWipeConfirm(true)}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--red, #ef4444)',
                background: 'none', color: 'var(--red, #ef4444)', cursor: 'pointer', fontSize: '0.85rem',
              }}
            >
              Wipe All Data...
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--red, #ef4444)', fontSize: '0.85rem', fontWeight: 600 }}>Are you sure?</span>
              <button
                onClick={handleWipe}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none',
                  background: 'var(--red, #ef4444)', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                }}
              >
                Yes, wipe everything
              </button>
              <button className="ghost small" onClick={() => setWipeConfirm(false)}>Cancel</button>
            </div>
          )}
          <StatusMessage status={wipeStatus} />
        </div>
      </div>
    </div>
  );
}

function StatusMessage({ status }: { status: string | null }) {
  if (!status) return null;
  const isError = status.startsWith('Error');
  return (
    <div style={{
      marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: '0.85rem',
      background: isError ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
      color: isError ? 'var(--red, #ef4444)' : 'var(--green, #22c55e)',
    }}>
      {status}
    </div>
  );
}
