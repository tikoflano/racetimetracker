import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { IS_DEV } from '../env';
import Modal from './Modal';
import type { Event, Organization, PinnedEvent, OrgMember } from '../module_bindings/types';

interface SidebarProps {
  className?: string;
  activeOrg: Organization | null;
  userOrgs: readonly Organization[];
  onSwitchOrg: (orgId: bigint) => void;
  userName: string;
  onLogout: () => void;
}

export default function Sidebar({ className = '', activeOrg, userOrgs, onSwitchOrg, userName, onLogout }: SidebarProps) {
  const { user, isAuthenticated, canManageOrg, canManageOrgEvents, getOrgRole, isOrgOwner } = useAuth();
  const [events] = useTable(tables.event);
  const [pinnedEvents] = useTable(tables.pinned_event);
  const [orgMembers] = useTable(tables.org_member);

  const togglePin = useReducer(reducers.togglePinEvent);

  const [switchModalOpen, setSwitchModalOpen] = useState(false);

  const pinnedEventIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(
      pinnedEvents.filter((f: PinnedEvent) => f.userId === user.id).map(f => f.eventId)
    );
  }, [user, pinnedEvents]);

  const pinnedList = useMemo(() => {
    return events.filter((e: Event) => pinnedEventIds.has(e.id));
  }, [events, pinnedEventIds]);

  const hasMultipleOrgs = userOrgs.length > 1;

  return (
    <nav className={`sidebar ${className}`.trim()}>
      <div className="sidebar-section">
        <div className="sidebar-label">Pinned Events</div>
        {pinnedList.length === 0 ? (
          <div className="sidebar-empty">No pinned events</div>
        ) : (
          pinnedList.map((e: Event) => (
            <div key={String(e.id)} className="sidebar-event-row">
              <NavLink
                to={`/event/${e.slug}`}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                {e.name}
              </NavLink>
              <button
                className="pin-btn"
                onClick={() => togglePin({ eventId: e.id })}
                title="Unpin event"
              >
                {'\u{1F4CC}'}
              </button>
            </div>
          ))
        )}
      </div>

      {isAuthenticated && (
        <div className="sidebar-section">
          <NavLink
            to="/calendar"
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            Calendar
          </NavLink>
          <NavLink
            to="/timekeep"
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            Timekeeping
          </NavLink>
        </div>
      )}

      {activeOrg && canManageOrgEvents(activeOrg.id) && (
        <div className="sidebar-section">
          <div className="sidebar-label">Manage</div>
          <NavLink
            to="/championships"
            className={({ isActive }) => `sidebar-link sub${isActive ? ' active' : ''}`}
          >
            Championships
          </NavLink>
          <NavLink
            to="/venues"
            className={({ isActive }) => `sidebar-link sub${isActive ? ' active' : ''}`}
          >
            Venues
          </NavLink>
          <NavLink
            to="/racers"
            className={({ isActive }) => `sidebar-link sub${isActive ? ' active' : ''}`}
          >
            Racers
          </NavLink>
          {canManageOrg(activeOrg.id) && (
            <NavLink
              to="/members"
              className={({ isActive }) => `sidebar-link sub${isActive ? ' active' : ''}`}
            >
              Members
            </NavLink>
          )}
        </div>
      )}

      {IS_DEV && isAuthenticated && (
        <div className="sidebar-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <NavLink
            to="/dev"
            className={({ isActive }) => `sidebar-link sub${isActive ? ' active' : ''}`}
            style={{ fontSize: '0.8rem', opacity: 0.6 }}
          >
            Dev Tools
          </NavLink>
        </div>
      )}

      {hasMultipleOrgs && (
        <div className="sidebar-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <button
            className="ghost small"
            style={{ width: '100%', textAlign: 'left', fontSize: '0.8rem', background: 'var(--border)' }}
            onClick={() => setSwitchModalOpen(true)}
          >
            Switch Organization
          </button>
        </div>
      )}

      {isAuthenticated && (
        <div className="sidebar-section sidebar-user-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="small-text" style={{ opacity: 0.8 }}>{userName}</span>
            <button className="ghost small" onClick={onLogout}>Sign out</button>
          </div>
        </div>
      )}

      <Modal open={switchModalOpen} onClose={() => setSwitchModalOpen(false)} title="Switch Organization">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {userOrgs.map((o: Organization) => {
            const isActive = activeOrg?.id === o.id;
            const role = isOrgOwner(o.id) ? 'owner' : getOrgRole(o.id);
            return (
              <button
                key={String(o.id)}
                onClick={() => { onSwitchOrg(o.id); setSwitchModalOpen(false); }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius)',
                  border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: isActive ? 'var(--accent-bg, rgba(59,130,246,0.1))' : 'var(--surface)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontWeight: isActive ? 600 : 400 }}>{o.name}</span>
                {role && (
                  <span className="badge" style={{
                    fontSize: '0.7rem',
                    background: role === 'owner' || role === 'admin' ? 'var(--green-bg)' : undefined,
                    color: role === 'owner' || role === 'admin' ? 'var(--green)' : undefined,
                  }}>
                    {role}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Modal>
    </nav>
  );
}
