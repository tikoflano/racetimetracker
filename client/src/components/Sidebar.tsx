import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import type { Event, Organization, PinnedEvent } from '../module_bindings/types';

export default function Sidebar() {
  const { user, isAuthenticated, canManageOrg } = useAuth();
  const [events] = useTable(tables.event);
  const [orgs] = useTable(tables.organization);
  const [pinnedEvents] = useTable(tables.pinned_event);

  const togglePin = useReducer(reducers.togglePinEvent);

  // Orgs the user can manage (owner or admin/manager)
  const managedOrgs = isAuthenticated
    ? orgs.filter((o: Organization) => canManageOrg(o.id))
    : [];

  // IDs of orgs the user owns
  const userOrgIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(orgs.filter((o: Organization) => o.ownerUserId === user.id).map(o => o.id));
  }, [user, orgs]);

  // User's pinned event IDs
  const pinnedEventIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(
      pinnedEvents.filter((f: PinnedEvent) => f.userId === user.id).map(f => f.eventId)
    );
  }, [user, pinnedEvents]);

  // Events from user's org(s)
  const orgEvents = useMemo(() => {
    return events.filter((e: Event) => userOrgIds.has(e.orgId));
  }, [events, userOrgIds]);

  const pinnedList = useMemo(() => orgEvents.filter(e => pinnedEventIds.has(e.id)), [orgEvents, pinnedEventIds]);
  const unpinnedList = useMemo(() => orgEvents.filter(e => !pinnedEventIds.has(e.id)), [orgEvents, pinnedEventIds]);

  const renderEventRow = (e: Event) => (
    <div key={String(e.id)} className="sidebar-event-row">
      <NavLink
        to={`/event/${e.id}`}
        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
      >
        {e.name}
      </NavLink>
      {isAuthenticated && (
        <button
          className="pin-btn"
          onClick={() => togglePin({ eventId: e.id })}
          title={pinnedEventIds.has(e.id) ? 'Unpin event' : 'Pin event'}
        >
          {pinnedEventIds.has(e.id) ? '\u{1F4CC}' : '\u2606'}
        </button>
      )}
    </div>
  );

  return (
    <nav className="sidebar">
      {pinnedList.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-label">Pinned Events</div>
          {pinnedList.map(renderEventRow)}
        </div>
      )}

      <div className="sidebar-section">
        <div className="sidebar-label">Events</div>
        {unpinnedList.length === 0 ? (
          <div className="sidebar-empty">{orgEvents.length === 0 ? 'No events' : 'All events pinned'}</div>
        ) : (
          unpinnedList.map(renderEventRow)
        )}
      </div>

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
                to={`/org/${o.id}/members`}
                className={({ isActive }) => `sidebar-link sub${isActive ? ' active' : ''}`}
              >
                Members
              </NavLink>
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
