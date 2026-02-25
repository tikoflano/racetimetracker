import { useState, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import type { Organization, OrgMember, User, Event } from '../module_bindings/types';

export default function OrgMembersView() {
  const { orgId } = useParams<{ orgId: string }>();
  const oid = BigInt(orgId ?? '0');
  const { isAuthenticated, isReady, canManageOrg, isOrgOwner } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [orgMembers] = useTable(tables.org_member);
  const [users] = useTable(tables.user);

  const [events] = useTable(tables.event);

  const addOrgMember = useReducer(reducers.addOrgMember);
  const removeOrgMember = useReducer(reducers.removeOrgMember);
  const renameOrganization = useReducer(reducers.renameOrganization);
  const seedDemoData = useReducer(reducers.seedDemoData);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager'>('manager');
  const [error, setError] = useState('');

  // Inline rename state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [renameError, setRenameError] = useState('');

  const org = orgs.find((o: Organization) => o.id === oid);
  const isOwner = isOrgOwner(oid);
  const hasAccess = canManageOrg(oid);

  const members = useMemo(() => {
    return orgMembers
      .filter((m: OrgMember) => m.orgId === oid)
      .map((m: OrgMember) => {
        const u = users.find((u: User) => u.id === m.userId);
        return { member: m, user: u };
      });
  }, [orgMembers, users, oid]);

  const ownerUser = useMemo(() => {
    if (!org) return null;
    return users.find((u: User) => u.id === org.ownerUserId) ?? null;
  }, [org, users]);

  if (!isReady) return null;
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!org) {
    if (orgs.length === 0) return null;
    return <div className="empty">Organization not found.</div>;
  }

  if (!hasAccess) {
    return <div className="empty">You don't have access to manage this organization.</div>;
  }

  const startEditing = () => {
    setEditName(org.name);
    setRenameError('');
    setEditing(true);
  };

  const handleRename = async () => {
    setRenameError('');
    const trimmed = editName.trim();
    if (!trimmed) { setRenameError('Name cannot be empty'); return; }
    if (trimmed === org.name) { setEditing(false); return; }
    try {
      await renameOrganization({ orgId: oid, name: trimmed });
      setEditing(false);
    } catch (e: any) {
      setRenameError(e?.message || 'Failed to rename');
    }
  };

  const handleInvite = async () => {
    setError('');
    const targetUser = users.find((u: User) => u.email === inviteEmail.trim());
    if (!targetUser) {
      setError('User not found. They must sign in at least once before being invited.');
      return;
    }
    try {
      await addOrgMember({ orgId: oid, userId: targetUser.id, role: inviteRole });
      setInviteEmail('');
    } catch (e: any) {
      setError(e?.message || 'Failed to add member');
    }
  };

  const handleRemove = async (memberId: bigint) => {
    try {
      await removeOrgMember({ orgMemberId: memberId });
    } catch (e: any) {
      setError(e?.message || 'Failed to remove member');
    }
  };

  return (
    <div>
      {/* Org name — editable */}
      {editing ? (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
              autoFocus
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--accent)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '1.4rem',
                fontWeight: 700,
              }}
            />
            <button className="primary small" onClick={handleRename}>Save</button>
            <button className="ghost small" onClick={() => setEditing(false)}>Cancel</button>
          </div>
          {renameError && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: 4 }}>{renameError}</div>}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h1 style={{ marginBottom: 0 }}>{org.name}</h1>
          {hasAccess && (
            <button className="ghost small" onClick={startEditing} title="Rename">&#9998;</button>
          )}
        </div>
      )}
      <p className="muted small-text" style={{ marginBottom: 20 }}>Organization members and permissions</p>

      {/* Owner */}
      <div className="section">
        <div className="section-title">Owner</div>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span>{ownerUser ? `${ownerUser.name || ownerUser.email}` : 'No owner'}</span>
            {ownerUser && <span className="muted small-text" style={{ marginLeft: 8 }}>{ownerUser.email}</span>}
          </div>
          <span className="badge" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>Owner</span>
        </div>
      </div>

      {/* Seed demo data if org has no events */}
      {isOwner && events.filter((e: Event) => e.orgId === oid).length === 0 && (
        <div className="card" style={{ marginBottom: 16, textAlign: 'center', padding: 16 }}>
          <p className="muted small-text" style={{ marginBottom: 8 }}>No events yet in this organization.</p>
          <button className="primary" onClick={() => seedDemoData()}>Load Demo Data</button>
        </div>
      )}

      {/* Members */}
      <div className="section">
        <div className="section-title">Members ({members.length})</div>
        {members.length === 0 ? (
          <div className="empty">No members yet. Invite someone below.</div>
        ) : (
          members.map(({ member, user: memberUser }) => (
            <div
              key={String(member.id)}
              className="card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <span>{memberUser ? `${memberUser.name || memberUser.email}` : `User #${member.userId}`}</span>
                {memberUser && <span className="muted small-text" style={{ marginLeft: 8 }}>{memberUser.email}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`badge ${member.role === 'admin' ? 'running' : 'queued'}`}>
                  {member.role}
                </span>
                {isOwner && (
                  <button className="ghost small" onClick={() => handleRemove(member.id)}>Remove</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invite form */}
      {hasAccess && (
        <div className="section">
          <div className="section-title">Invite Member</div>
          <div className="card">
            {error && (
              <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '0.875rem',
                }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'manager')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '0.875rem',
                }}
              >
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <button className="primary" onClick={handleInvite}>Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
