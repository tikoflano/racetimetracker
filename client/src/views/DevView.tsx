import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrgMaybe } from '../OrgContext';
import { IS_DEV } from '../env';
import { getErrorMessage } from '../utils';
import SearchableSelect from '../components/SearchableSelect';
import type { Organization, OrgMember, User } from '../module_bindings/types';

export default function DevView() {
  const { isAuthenticated, isReady } = useAuth();
  useActiveOrgMaybe();
  const seedDemoData = useReducer(reducers.seedDemoData);
  const wipeAllData = useReducer(reducers.wipeAllData);
  const transferOwnership = useReducer(reducers.transferOrgOwnershipByEmail);

  const [orgs] = useTable(tables.organization);
  const [orgMembers] = useTable(tables.org_member);
  const [users] = useTable(tables.user);

  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [transferStatus, setTransferStatus] = useState<string | null>(null);

  const sortedOrgs = useMemo(
    () => [...orgs].sort((a: Organization, b: Organization) => a.name.localeCompare(b.name)),
    [orgs]
  );

  const adminCandidates = useMemo(() => {
    if (!selectedOrg) return [];
    return orgMembers
      .filter(
        (m: OrgMember) =>
          m.orgId === selectedOrg.id &&
          m.role === 'admin' &&
          m.userId !== selectedOrg.ownerUserId
      )
      .map((m: OrgMember) => users.find((u: User) => u.id === m.userId))
      .filter((u): u is User => !!u && !u.googleSub?.startsWith('pending:'))
      .sort((a, b) =>
        (a.name || a.email || '').localeCompare(b.name || b.email || '')
      );
  }, [orgMembers, users, selectedOrg]);

  if (!IS_DEV) return <Navigate to="/" replace />;
  if (!isReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  const handleReset = async () => {
    setResetStatus('Wiping data...');
    try {
      await wipeAllData();
      setResetStatus('Done! Signing out...');
      setTimeout(() => {
        localStorage.clear();
        window.location.href = '/';
      }, 1000);
    } catch (e: unknown) {
      setResetStatus(`Error: ${getErrorMessage(e, 'Failed to reset')}`);
    }
  };

  const handleSeed = async () => {
    setSeedStatus('Seeding demo data...');
    try {
      await seedDemoData();
      setSeedStatus('Done!');
    } catch (e: unknown) {
      setSeedStatus(`Error: ${getErrorMessage(e, 'Failed to seed data')}`);
    }
  };

  const handleTransfer = async () => {
    setTransferStatus(null);
    if (!selectedOrg) {
      setTransferStatus('Error: Select an organization');
      return;
    }
    if (!selectedUser?.email) {
      setTransferStatus('Error: Select an admin user');
      return;
    }
    try {
      await transferOwnership({ orgId: selectedOrg.id, email: selectedUser.email.trim() });
      setTransferStatus('Ownership transferred successfully.');
      setSelectedUser(null);
    } catch (e: unknown) {
      setTransferStatus(`Error: ${getErrorMessage(e, 'Failed to transfer')}`);
    }
  };

  const handleOrgChange = (org: Organization | null) => {
    setSelectedOrg(org);
    if (org) setSelectedUser(null);
  };

  return (
    <div>
      <h1>Developer Tools</h1>
      <p className="muted small-text" style={{ marginBottom: 20 }}>
        These tools are only available in development mode.
      </p>

      {/* Reset & Seed */}
      <div className="section">
        <div className="section-title">Data Management</div>
        <div
          className="card"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <div className="muted small-text">
              Wipes all existing data. You will be logged out afterwards.
            </div>
          </div>
          <button className="primary" onClick={handleReset} style={{ whiteSpace: 'nowrap' }}>
            Reset
          </button>
        </div>
        <StatusMessage status={resetStatus} />
        <div
          className="card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 12,
          }}
        >
          <div>
            <div className="muted small-text">
              Creates sample championships, locations, events, riders, and org members.
            </div>
          </div>
          <button className="primary" onClick={handleSeed} style={{ whiteSpace: 'nowrap' }}>
            Seed
          </button>
        </div>
        <StatusMessage status={seedStatus} />
      </div>

      {/* Transfer ownership */}
      <div className="section">
        <div className="section-title">Transfer Organization Ownership</div>
        <div className="card">
          <div className="muted small-text" style={{ marginBottom: 12 }}>
            Transfer ownership to an admin user. No permission checks.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="input-label">Organization</label>
              <SearchableSelect<Organization>
                items={sortedOrgs}
                value={selectedOrg}
                onChange={handleOrgChange}
                getLabel={(o) => o.name}
                getKey={(o) => String(o.id)}
                placeholder="Select organization..."
                filterFn={(o, q) =>
                  o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q)
                }
              />
            </div>
            <div>
              <label className="input-label">New owner (admin)</label>
              <SearchableSelect<User>
                items={adminCandidates}
                value={selectedUser}
                onChange={setSelectedUser}
                getLabel={(u) => u.name || u.email || `User #${u.id}`}
                getKey={(u) => String(u.id)}
                placeholder={
                  selectedOrg
                    ? 'Select admin...'
                    : 'Select an organization first'
                }
                filterFn={(u, q) => {
                  const name = (u.name || u.email || '').toLowerCase();
                  const email = (u.email || '').toLowerCase();
                  return name.includes(q) || email.includes(q);
                }}
                disabled={!selectedOrg}
              />
            </div>
            <button
              className="primary"
              onClick={handleTransfer}
              disabled={!selectedOrg || !selectedUser}
              style={{ gridColumn: '1 / -1' }}
            >
              Transfer
            </button>
          </div>
          <StatusMessage status={transferStatus} />
        </div>
      </div>
    </div>
  );
}

function StatusMessage({ status }: { status: string | null }) {
  if (!status) return null;
  const isError = status.startsWith('Error');
  return (
    <div
      style={{
        marginTop: 8,
        padding: '8px 12px',
        borderRadius: 'var(--radius)',
        fontSize: '0.85rem',
        background: isError ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
        color: isError ? 'var(--red, #ef4444)' : 'var(--green, #22c55e)',
      }}
    >
      {status}
    </div>
  );
}
