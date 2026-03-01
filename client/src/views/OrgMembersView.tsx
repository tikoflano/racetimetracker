import { useState, useMemo, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrgMaybe } from '../OrgContext';
import {
  FontAwesomeIcon,
  faPen,
  faPlus,
  faRightFromBracket,
  faEllipsisVertical,
  faEnvelope,
  faArrowRightArrowLeft,
  faUser,
  faTrash,
} from '../icons';
import Modal from '../components/Modal';
import ErrorBanner from '../components/ErrorBanner';
import { getErrorMessage } from '../utils';
import type { Organization, OrgMember, User } from '../module_bindings/types';

export default function OrgMembersView() {
  const oid = useActiveOrgMaybe();
  const navigate = useNavigate();
  const { user, isAuthenticated, isReady, canManageOrg, isOrgOwner, canImpersonate } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [orgMembers] = useTable(tables.org_member);
  const [users] = useTable(tables.user);

  const inviteOrgMember = useReducer(reducers.inviteOrgMember);
  const resendOrgInvitation = useReducer(reducers.resendOrgInvitation);
  const removeOrgMember = useReducer(reducers.removeOrgMember);
  const renameOrganization = useReducer(reducers.renameOrganization);
  const transferOrgOwnership = useReducer(reducers.transferOrgOwnership);
  const leaveOrganization = useReducer(reducers.leaveOrganization);
  const startImpersonation = useReducer(reducers.startImpersonation);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'timekeeper'>('manager');
  const [error, setError] = useState('');
  const [openMenuId, setOpenMenuId] = useState<bigint | null>(null);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetUserId, setTransferTargetUserId] = useState<bigint | ''>('');

  // Inline rename state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [renameError, setRenameError] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<
    'all' | 'owner' | 'admin' | 'manager' | 'timekeeper'
  >('all');

  const org = oid ? orgs.find((o: Organization) => o.id === oid) : null;
  const isOwner = oid !== null ? isOrgOwner(oid) : false;
  const hasAccess = oid !== null ? canManageOrg(oid) : false;

  const members = useMemo(() => {
    if (!oid) return [];
    const ownerId = org?.ownerUserId;
    return orgMembers
      .filter((m: OrgMember) => m.orgId === oid && m.userId !== ownerId)
      .map((m: OrgMember) => {
        const u = users.find((u: User) => u.id === m.userId);
        return { member: m, user: u };
      });
  }, [orgMembers, users, oid, org?.ownerUserId]);

  const ownerUser = useMemo(() => {
    if (!org) return null;
    return users.find((u: User) => u.id === org.ownerUserId) ?? null;
  }, [org, users]);

  const adminCandidates = useMemo(() => {
    if (!user) return [];
    return members
      .filter((m) => m.member.role === 'admin' && m.member.userId !== user.id)
      .filter((m) => m.user && !m.user.googleSub?.startsWith('pending:'))
      .sort((a, b) =>
        (a.user?.name || a.user?.email || '').localeCompare(b.user?.name || b.user?.email || '')
      );
  }, [members, user]);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    const matchesSearch = (u: User | null) => {
      if (!u) return false;
      const name = (u.name || u.email || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return !q || name.includes(q) || email.includes(q);
    };
    const ownerIncluded =
      ownerUser &&
      (roleFilter === 'all' || roleFilter === 'owner') &&
      matchesSearch(ownerUser ?? null);
    const filteredMembers = members.filter(({ member, user: mu }) => {
      if (roleFilter !== 'all' && roleFilter !== member.role) return false;
      return matchesSearch(mu ?? null);
    });
    return { ownerIncluded, ownerUser, filteredMembers };
  }, [members, ownerUser, search, roleFilter]);

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
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to leave organization'));
    }
  };

  if (!isReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!oid) return null;

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
    if (!trimmed) {
      setRenameError('Name cannot be empty');
      return;
    }
    if (trimmed === org.name) {
      setEditing(false);
      return;
    }
    try {
      await renameOrganization({ orgId: oid, name: trimmed });
      setEditing(false);
    } catch (e: unknown) {
      setRenameError(getErrorMessage(e, 'Failed to rename'));
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
      await inviteOrgMember({
        orgId: oid,
        email: trimmed,
        name: inviteName.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteName('');
      setShowInviteForm(false);
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to invite member'));
    }
  };

  const handleTransferOwnership = async () => {
    if (transferTargetUserId === '') return;
    if (!confirm('Are you sure you want to transfer ownership? You will become a regular admin.'))
      return;
    setError('');
    try {
      await transferOrgOwnership({ orgId: oid, newOwnerUserId: transferTargetUserId });
      setShowTransferModal(false);
      setTransferTargetUserId('');
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to transfer ownership'));
    }
  };

  const handleResend = async (memberId: bigint) => {
    setError('');
    try {
      await resendOrgInvitation({ orgMemberId: memberId });
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to resend invitation'));
    }
  };

  const handleRemove = async (memberId: bigint) => {
    try {
      await removeOrgMember({ orgMemberId: memberId });
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to remove member'));
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setEditing(false);
              }}
              autoFocus
              className="input"
              style={{ flex: 1, fontSize: '1.4rem', fontWeight: 700 }}
            />
            <button className="primary small" onClick={handleRename}>
              Save
            </button>
            <button className="ghost small" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
          {renameError && (
            <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: 4 }}>
              {renameError}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <h1 style={{ marginBottom: 0 }}>{org.name}</h1>
          <OrgActionMenu
            open={orgMenuOpen}
            onToggle={() => setOrgMenuOpen(!orgMenuOpen)}
            onClose={() => setOrgMenuOpen(false)}
            onRename={() => {
              setOrgMenuOpen(false);
              startEditing();
            }}
            onInvite={() => {
              setOrgMenuOpen(false);
              setError('');
              setShowInviteForm(true);
            }}
            onTransferOwnership={() => {
              setOrgMenuOpen(false);
              if (adminCandidates.length === 0) {
                setError('No other admins in this organization. Invite an admin first.');
              } else {
                setError('');
                setShowTransferModal(true);
                setTransferTargetUserId('');
              }
            }}
            onLeave={() => {
              setOrgMenuOpen(false);
              handleLeave();
            }}
            willDeleteOrg={willDeleteOrg}
            isAdmin={hasAccess}
            isOwner={isOwner}
          />
        </div>
      )}
      <p className="muted small-text" style={{ marginBottom: 20 }}>
        Organization members and permissions
      </p>
      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {/* Members table */}
      <div className="section">
        <div className="section-title">Members</div>
        {(ownerUser || members.length > 0) && (
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ maxWidth: 280 }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', 'owner', 'admin', 'manager', 'timekeeper'] as const).map((f) => {
                const labels: Record<string, string> = {
                  all: 'All',
                  owner: 'Owner',
                  admin: 'Admin',
                  manager: 'Manager',
                  timekeeper: 'Timekeeper',
                };
                const counts: Record<string, number> = {
                  all: (ownerUser ? 1 : 0) + members.length,
                  owner: ownerUser ? 1 : 0,
                  admin: members.filter((m) => m.member.role === 'admin').length,
                  manager: members.filter((m) => m.member.role === 'manager').length,
                  timekeeper: members.filter((m) => m.member.role === 'timekeeper').length,
                };
                return (
                  <button
                    key={f}
                    className={roleFilter === f ? 'primary small' : 'ghost small'}
                    onClick={() => setRoleFilter(f)}
                  >
                    {labels[f]} ({counts[f]})
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
            {filteredRows.ownerIncluded && (
              <tr>
                <td>
                  {filteredRows.ownerUser
                    ? filteredRows.ownerUser.name || filteredRows.ownerUser.email
                    : 'No owner'}
                </td>
                <td className="muted">{filteredRows.ownerUser?.email || ''}</td>
                <td></td>
                <td>
                  <span
                    className="badge"
                    style={{ background: 'var(--green-bg)', color: 'var(--green)' }}
                  >
                    owner/admin
                  </span>
                </td>
                {isOwner && <td></td>}
              </tr>
            )}
            {/* Member rows */}
            {filteredRows.filteredMembers.map(({ member, user: memberUser }) => {
              const isPending = memberUser?.googleSub?.startsWith('pending:') ?? false;
              const showImpersonate = canImpersonate && member.role !== 'admin' && memberUser;
              const menuOpen = openMenuId === member.id;
              return (
                <tr key={String(member.id)}>
                  <td style={isPending ? { opacity: 0.7 } : undefined}>
                    {memberUser ? memberUser.name || memberUser.email : `User #${member.userId}`}
                  </td>
                  <td className="muted">{memberUser?.email || ''}</td>
                  <td>
                    {isPending && (
                      <span
                        className="badge"
                        style={{
                          background: 'var(--yellow-bg, #fef3c7)',
                          color: 'var(--yellow, #d97706)',
                        }}
                      >
                        Pending
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${member.role === 'admin' ? 'running' : 'queued'}`}>
                      {member.role}
                    </span>
                  </td>
                  {isOwner && (
                    <td>
                      <MemberMenu
                        open={menuOpen}
                        onToggle={() => setOpenMenuId(menuOpen ? null : member.id)}
                        onClose={() => setOpenMenuId(null)}
                        showImpersonate={!!showImpersonate}
                        showResend={isPending}
                        onImpersonate={() => {
                          setOpenMenuId(null);
                          if (memberUser) startImpersonation({ targetUserId: memberUser.id });
                        }}
                        onResend={() => {
                          setOpenMenuId(null);
                          handleResend(member.id);
                        }}
                        onRemove={() => {
                          setOpenMenuId(null);
                          handleRemove(member.id);
                        }}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filteredRows.ownerIncluded && filteredRows.filteredMembers.length === 0 && (
          <div className="empty" style={{ marginTop: 8 }}>
            {ownerUser || members.length > 0
              ? 'No members match your search or filter.'
              : 'No members yet. Invite someone below.'}
          </div>
        )}
      </div>

      {/* Transfer ownership modal */}
      {showTransferModal && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 400 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>
            Transfer ownership
          </div>
          <p className="muted small-text" style={{ marginBottom: 12 }}>
            Transfer this organization to another admin. You will become a regular admin after the
            transfer.
          </p>
          {adminCandidates.length > 0 && (
            <>
              <select
                value={transferTargetUserId === '' ? '' : String(transferTargetUserId)}
                onChange={(e) =>
                  setTransferTargetUserId(e.target.value === '' ? '' : BigInt(e.target.value))
                }
                className="input"
                style={{ width: '100%', marginBottom: 12 }}
              >
                <option value="">Select admin...</option>
                {adminCandidates.map(({ member, user: u }) => (
                  <option key={String(member.id)} value={String(u!.id)}>
                    {u!.name || u!.email || `User #${u!.id}`}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="primary small"
                  onClick={handleTransferOwnership}
                  disabled={transferTargetUserId === ''}
                >
                  Transfer
                </button>
                <button
                  className="ghost small"
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferTargetUserId('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Invite member modal */}
      {hasAccess && (
        <Modal
          open={showInviteForm}
          onClose={() => {
            setShowInviteForm(false);
            setError('');
          }}
          title="Invite Member"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {error && <ErrorBanner message={error} onDismiss={() => setError('')} noMargin />}
            <div>
              <label className="input-label">Name</label>
              <input
                type="text"
                placeholder="Name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                className="input"
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
            <div>
              <label className="input-label">Email address</label>
              <input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                className="input"
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
            <div>
              <label className="input-label">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'manager')}
                className="input"
                style={{ width: '100%', marginTop: 4 }}
              >
                <option value="manager">Manager</option>
                <option value="timekeeper">Timekeeper</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="primary" onClick={handleInvite}>
                Invite
              </button>
              <button
                className="ghost small"
                onClick={() => {
                  setShowInviteForm(false);
                  setError('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function OrgActionMenu({
  open,
  onToggle,
  onClose,
  onRename,
  onInvite,
  onTransferOwnership,
  onLeave,
  willDeleteOrg,
  isAdmin,
  isOwner,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRename: () => void;
  onInvite: () => void;
  onTransferOwnership: () => void;
  onLeave: () => void;
  willDeleteOrg: boolean;
  isAdmin: boolean;
  isOwner: boolean;
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
    whiteSpace: 'nowrap',
  };
  const iconStyle: React.CSSProperties = {
    width: 16,
    textAlign: 'center',
    flexShrink: 0,
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
            minWidth: 220,
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {isAdmin && (
            <button
              onClick={onRename}
              style={itemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={iconStyle}>
                <FontAwesomeIcon icon={faPen} />
              </span>
              <span>Rename</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onInvite}
              style={itemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={iconStyle}>
                <FontAwesomeIcon icon={faPlus} />
              </span>
              <span>Invite member</span>
            </button>
          )}
          {isOwner && (
            <button
              onClick={onTransferOwnership}
              style={itemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={iconStyle}>
                <FontAwesomeIcon icon={faArrowRightArrowLeft} />
              </span>
              <span>Transfer ownership</span>
            </button>
          )}
          <button
            onClick={onLeave}
            style={{ ...itemStyle, color: 'var(--red, #ef4444)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <span style={iconStyle}>
              <FontAwesomeIcon icon={faRightFromBracket} />
            </span>
            <span>{willDeleteOrg ? 'Leave & delete' : 'Leave'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MemberMenu({
  open,
  onToggle,
  onClose,
  showImpersonate,
  showResend,
  onImpersonate,
  onResend,
  onRemove,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  showImpersonate: boolean;
  showResend: boolean;
  onImpersonate: () => void;
  onResend: () => void;
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
        <div
          style={{
            position: 'absolute',
            right: 0,
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
          {showImpersonate && (
            <button
              onClick={onImpersonate}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 10,
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                color: 'var(--text)',
                fontSize: '0.85rem',
                textAlign: 'left',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ width: 16, textAlign: 'center', flexShrink: 0 }}>
                <FontAwesomeIcon icon={faUser} />
              </span>
              Impersonate
            </button>
          )}
          {showResend && (
            <button
              onClick={onResend}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 10,
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                color: 'var(--text)',
                fontSize: '0.85rem',
                textAlign: 'left',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ width: 16, textAlign: 'center', flexShrink: 0 }}>
                <FontAwesomeIcon icon={faEnvelope} />
              </span>
              Resend invitation
            </button>
          )}
          <button
            onClick={onRemove}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 10,
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'none',
              color: 'var(--red, #ef4444)',
              fontSize: '0.85rem',
              textAlign: 'left',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <span style={{ width: 16, textAlign: 'center', flexShrink: 0 }}>
              <FontAwesomeIcon icon={faTrash} />
            </span>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
