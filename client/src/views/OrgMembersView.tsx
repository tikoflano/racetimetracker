import { useState, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import type { Organization, OrgMember, User } from '../module_bindings/types';

export default function OrgMembersView() {
  const { orgId } = useParams<{ orgId: string }>();
  const oid = BigInt(orgId ?? '0');
  const { user, isAuthenticated, canManageOrg, isOrgOwner } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [orgMembers] = useTable(tables.org_member);
  const [users] = useTable(tables.user);

  const addOrgMember = useReducer(reducers.addOrgMember);
  const removeOrgMember = useReducer(reducers.removeOrgMember);
  const claimOrgOwnership = useReducer(reducers.claimOrgOwnership);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager'>('manager');
  const [error, setError] = useState('');

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

  // Org has no owner — allow claiming
  const canClaim = isAuthenticated && org && org.ownerUserId === 0n;

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!org) {
    return <div className="empty">Organization not found.</div>;
  }

  if (!hasAccess && !canClaim) {
    return <div className="empty">You don't have access to manage this organization.</div>;
  }

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

  const handleClaim = async () => {
    try {
      await claimOrgOwnership({ orgId: oid });
    } catch (e: any) {
      setError(e?.message || 'Failed to claim ownership');
    }
  };

  return (
    <div>
      <h1>{org.name}</h1>
      <p className="muted small-text" style={{ marginBottom: 20 }}>Organization members and permissions</p>

      {canClaim && (
        <div className="card" style={{ borderColor: 'var(--accent)', marginBottom: 20 }}>
          <p style={{ marginBottom: 8 }}>This organization has no owner.</p>
          <button className="primary" onClick={handleClaim}>Claim Ownership</button>
        </div>
      )}

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
