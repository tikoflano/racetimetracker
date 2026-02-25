import { useState, useMemo, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrg } from '../OrgContext';
import { FontAwesomeIcon, faPen, faPlus, faRightFromBracket, faEllipsisVertical } from '../icons';
import type { Organization, OrgMember, User } from '../module_bindings/types';

export default function OrgMembersView() {
  const oid = useActiveOrg();
  const navigate = useNavigate();
  const { user, isAuthenticated, isReady, canManageOrg, isOrgOwner, canImpersonate } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [orgMembers] = useTable(tables.org_member);
  const [users] = useTable(tables.user);

  const inviteOrgMember = useReducer(reducers.inviteOrgMember);
  const removeOrgMember = useReducer(reducers.removeOrgMember);
  const renameOrganization = useReducer(reducers.renameOrganization);
  const leaveOrganization = useReducer(reducers.leaveOrganization);
  const startImpersonation = useReducer(reducers.startImpersonation);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'timekeeper'>('manager');
  const [error, setError] = useState('');
  const [openMenuId, setOpenMenuId] = useState<bigint | null>(null);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

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

  const willDeleteOrg = useMemo(() => {
    if (!org || !user) return false;
    const isCallerOwner = org.ownerUserId === user.id;
    if (!isCallerOwner) return false;
    for (const { member, user: mu } of members) {
      if (member.userId === user.id) continue;
      if (member.role === 'admin' && mu && !mu.googleSub?.startsWith('pending:')) return false;
    }
    return true;
  }, [org, user, members]);

  const handleLeave = async () => {
    const msg = willDeleteOrg
      ? 'You are the only admin. Leaving will permanently delete this organization and all its data. Are you sure?'
      : 'Are you sure you want to leave this organization?';
    if (!confirm(msg)) return;
    try {
      await leaveOrganization({ orgId: oid });
      navigate('/');
    } catch (e: any) {
      setError(e?.message || 'Failed to leave organization');
    }
  };

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
    const trimmed = inviteEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      await inviteOrgMember({ orgId: oid, email: trimmed, role: inviteRole });
      setInviteEmail('');
    } catch (e: any) {
      setError(e?.message || 'Failed to invite member');
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
      {/* Org name with dropdown */}
      {editing ? (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
              autoFocus
              className="input"
              style={{ flex: 1, fontSize: '1.4rem', fontWeight: 700 }}
            />
            <button className="primary small" onClick={handleRename}>Save</button>
            <button className="ghost small" onClick={() => setEditing(false)}>Cancel</button>
          </div>
          {renameError && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: 4 }}>{renameError}</div>}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <h1 style={{ marginBottom: 0 }}>{org.name}</h1>
          <OrgActionMenu
            open={orgMenuOpen}
            onToggle={() => setOrgMenuOpen(!orgMenuOpen)}
            onClose={() => setOrgMenuOpen(false)}
            onRename={() => { setOrgMenuOpen(false); startEditing(); }}
            onInvite={() => { setOrgMenuOpen(false); setShowInviteForm(true); }}
            onLeave={() => { setOrgMenuOpen(false); handleLeave(); }}
            willDeleteOrg={willDeleteOrg}
            isAdmin={hasAccess}
          />
        </div>
      )}
      <p className="muted small-text" style={{ marginBottom: 20 }}>Organization members and permissions</p>

      {/* Members table */}
      <div className="section">
        <div className="section-title">Members</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Role</th>
              {isOwner && <th style={{ width: 40 }}></th>}
            </tr>
          </thead>
          <tbody>
            {/* Owner row */}
            <tr>
              <td>{ownerUser ? (ownerUser.name || ownerUser.email) : 'No owner'}</td>
              <td className="muted">{ownerUser?.email || ''}</td>
              <td></td>
              <td><span className="badge" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>owner</span></td>
              {isOwner && <td></td>}
            </tr>
            {/* Member rows */}
            {members.map(({ member, user: memberUser }) => {
              const isPending = memberUser?.googleSub?.startsWith('pending:') ?? false;
              const showImpersonate = canImpersonate && member.role !== 'admin' && memberUser;
              const menuOpen = openMenuId === member.id;
              return (
                <tr key={String(member.id)}>
                  <td style={isPending ? { opacity: 0.7 } : undefined}>
                    {memberUser ? (memberUser.name || memberUser.email) : `User #${member.userId}`}
                  </td>
                  <td className="muted">{isPending ? '' : memberUser?.email || ''}</td>
                  <td>
                    {isPending && <span className="badge" style={{ background: 'var(--yellow-bg, #fef3c7)', color: 'var(--yellow, #d97706)' }}>Pending</span>}
                  </td>
                  <td>
                    <span className={`badge ${member.role === 'admin' ? 'running' : 'queued'}`}>{member.role}</span>
                  </td>
                  {isOwner && (
                    <td>
                      <MemberMenu
                        open={menuOpen}
                        onToggle={() => setOpenMenuId(menuOpen ? null : member.id)}
                        onClose={() => setOpenMenuId(null)}
                        showImpersonate={!!showImpersonate}
                        onImpersonate={() => { setOpenMenuId(null); if (memberUser) startImpersonation({ targetUserId: memberUser.id }); }}
                        onRemove={() => { setOpenMenuId(null); handleRemove(member.id); }}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {members.length === 0 && (
          <div className="empty" style={{ marginTop: 8 }}>No members yet. Invite someone below.</div>
        )}
      </div>

      {/* Invite form — toggled from org menu */}
      {hasAccess && showInviteForm && (
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
                autoFocus
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
                <option value="timekeeper">Timekeeper</option>
                <option value="admin">Admin</option>
              </select>
              <button className="primary" onClick={handleInvite}>Invite</button>
              <button className="ghost small" onClick={() => setShowInviteForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrgActionMenu({ open, onToggle, onClose, onRename, onInvite, onLeave, willDeleteOrg, isAdmin }: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRename: () => void;
  onInvite: () => void;
  onLeave: () => void;
  willDeleteOrg: boolean;
  isAdmin: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose]);

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
    gap: 10, width: '100%',
    padding: '9px 14px', border: 'none', background: 'none',
    color: 'var(--text)', fontSize: '0.85rem', textAlign: 'left', cursor: 'pointer',
  };
  const iconStyle: React.CSSProperties = {
    width: 16, textAlign: 'center', flexShrink: 0,
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="ghost small"
        onClick={onToggle}
        style={{ fontSize: '1rem', padding: '4px 8px' }}
        title="Organization actions"
      >
        <FontAwesomeIcon icon={faEllipsisVertical} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', left: 0, top: '100%', marginTop: 4,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          minWidth: 200, zIndex: 50, overflow: 'hidden',
        }}>
          {isAdmin && (
            <button onClick={onRename} style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={iconStyle}><FontAwesomeIcon icon={faPen} /></span><span>Rename organization</span>
            </button>
          )}
          {isAdmin && (
            <button onClick={onInvite} style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={iconStyle}><FontAwesomeIcon icon={faPlus} /></span><span>Invite member</span>
            </button>
          )}
          <button onClick={onLeave} style={{ ...itemStyle, color: 'var(--red, #ef4444)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <span style={iconStyle}><FontAwesomeIcon icon={faRightFromBracket} /></span><span>{willDeleteOrg ? 'Leave & delete organization' : 'Leave organization'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MemberMenu({ open, onToggle, onClose, showImpersonate, onImpersonate, onRemove }: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  showImpersonate: boolean;
  onImpersonate: () => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="ghost small"
        onClick={onToggle}
        style={{ fontSize: '1.1rem', lineHeight: 1, padding: '4px 6px' }}
        title="Actions"
      >
        <FontAwesomeIcon icon={faEllipsisVertical} />
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          marginTop: 4,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          minWidth: 150,
          zIndex: 50,
          overflow: 'hidden',
        }}>
          {showImpersonate && (
            <button
              onClick={onImpersonate}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                color: 'var(--text)',
                fontSize: '0.85rem',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Impersonate
            </button>
          )}
          <button
            onClick={onRemove}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'none',
              color: 'var(--red, #ef4444)',
              fontSize: '0.85rem',
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
