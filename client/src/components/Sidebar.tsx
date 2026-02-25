import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import type { Event, Organization, PinnedEvent, User, OrgMember, EventMember } from '../module_bindings/types';

export default function Sidebar({ className = '' }: { className?: string }) {
  const { user, realUser, isAuthenticated, isSuperAdmin, canImpersonate, isImpersonating, allUsers, canManageOrg } = useAuth();
  const [events] = useTable(tables.event);
  const [orgs] = useTable(tables.organization);
  const [pinnedEvents] = useTable(tables.pinned_event);

  const togglePin = useReducer(reducers.togglePinEvent);

  // Orgs the user can manage (owner or admin/manager)
  const managedOrgs = isAuthenticated
    ? orgs.filter((o: Organization) => canManageOrg(o.id))
    : [];

  // User's pinned event IDs
  const pinnedEventIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(
      pinnedEvents.filter((f: PinnedEvent) => f.userId === user.id).map(f => f.eventId)
    );
  }, [user, pinnedEvents]);

  // Pinned events resolved to full Event objects
  const pinnedList = useMemo(() => {
    return events.filter((e: Event) => pinnedEventIds.has(e.id));
  }, [events, pinnedEventIds]);

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
                to={`/event/${e.id}`}
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
        </div>
      )}

      {managedOrgs.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-label">Manage</div>
          {managedOrgs.map((o: Organization) => (
            <div key={String(o.id)}>
              <div className="sidebar-org-name">{o.name}</div>
              <NavLink
                to={`/org/${o.id}/championships`}
                className={({ isActive }) => `sidebar-link sub${isActive ? ' active' : ''}`}
              >
                Championships
              </NavLink>
              <NavLink
                to={`/org/${o.id}/venues`}
                className={({ isActive }) => `sidebar-link sub${isActive ? ' active' : ''}`}
              >
                Venues
              </NavLink>
              <NavLink
                to={`/org/${o.id}/racers`}
                className={({ isActive }) => `sidebar-link sub${isActive ? ' active' : ''}`}
              >
                Racers
              </NavLink>
              <NavLink
                to={`/org/${o.id}/members`}
                className={({ isActive }) => `sidebar-link sub${isActive ? ' active' : ''}`}
              >
                Members
              </NavLink>
            </div>
          ))}
        </div>
      )}

      {canImpersonate && <ImpersonationPicker />}
    </nav>
  );
}

function ImpersonationPicker() {
  const { allUsers, realUser, isSuperAdmin, isImpersonating } = useAuth();
  const startImpersonation = useReducer(reducers.startImpersonation);
  const stopImpersonation = useReducer(reducers.stopImpersonation);
  const [orgs] = useTable(tables.organization);
  const [orgMembers] = useTable(tables.org_member);
  const [eventMembers] = useTable(tables.event_member);
  const [events] = useTable(tables.event);
  const [search, setSearch] = useState('');

  // For org admins: collect user IDs that belong to their managed orgs
  const impersonatableUsers = useMemo(() => {
    if (!realUser) return [];
    if (isSuperAdmin) {
      // Super admins can impersonate anyone except themselves
      return allUsers.filter((u: User) => u.id !== realUser.id);
    }

    // Find orgs where the real user is admin (owner or admin role)
    const adminOrgIds = new Set<bigint>();
    for (const o of orgs) {
      if ((o as Organization).ownerUserId === realUser.id) adminOrgIds.add(o.id);
    }
    for (const m of orgMembers) {
      if ((m as OrgMember).userId === realUser.id && (m as OrgMember).role === 'admin') adminOrgIds.add((m as OrgMember).orgId);
    }

    // Collect user IDs in those orgs (org members + event members)
    const userIds = new Set<bigint>();
    for (const m of orgMembers) {
      if (adminOrgIds.has((m as OrgMember).orgId)) userIds.add((m as OrgMember).userId);
    }
    for (const o of orgs) {
      if (adminOrgIds.has(o.id)) userIds.add((o as Organization).ownerUserId);
    }
    for (const evt of events) {
      if (!adminOrgIds.has((evt as Event).orgId)) continue;
      for (const em of eventMembers) {
        if ((em as EventMember).eventId === (evt as Event).id) userIds.add((em as EventMember).userId);
      }
    }

    // Exclude self and other org admins
    const adminUserIds = new Set<bigint>();
    for (const m of orgMembers) {
      if (adminOrgIds.has((m as OrgMember).orgId) && (m as OrgMember).role === 'admin') {
        adminUserIds.add((m as OrgMember).userId);
      }
    }
    for (const o of orgs) {
      if (adminOrgIds.has(o.id)) adminUserIds.add((o as Organization).ownerUserId);
    }

    userIds.delete(realUser.id);
    for (const id of adminUserIds) userIds.delete(id);

    return allUsers.filter((u: User) => userIds.has(u.id) && !u.isSuperAdmin);
  }, [realUser, isSuperAdmin, allUsers, orgs, orgMembers, eventMembers, events]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [...impersonatableUsers].sort((a, b) => a.name.localeCompare(b.name));
    return impersonatableUsers
      .filter((u: User) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .sort((a: User, b: User) => a.name.localeCompare(b.name));
  }, [impersonatableUsers, search]);

  return (
    <div className="sidebar-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <div className="sidebar-label">Switch User</div>
      {isImpersonating && (
        <button
          className="ghost small"
          style={{ width: '100%', marginBottom: 8, color: 'var(--red)' }}
          onClick={() => stopImpersonation()}
        >
          Stop Impersonating
        </button>
      )}
      <input
        type="text"
        className="input"
        placeholder="Search users..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ fontSize: '0.8rem', marginBottom: 4 }}
      />
      <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map((u: User) => (
          <button
            key={String(u.id)}
            className="ghost small"
            style={{ textAlign: 'left', padding: '4px 8px', fontSize: '0.75rem' }}
            onClick={() => startImpersonation({ targetUserId: u.id })}
          >
            {u.name || u.email}
          </button>
        ))}
        {filtered.length === 0 && <div className="muted small-text" style={{ padding: 4 }}>No users found</div>}
      </div>
    </div>
  );
}
