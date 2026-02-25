import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import type { Event, Organization, PinnedEvent } from '../module_bindings/types';

export default function Sidebar({ className = '' }: { className?: string }) {
  const { user, isAuthenticated, canManageOrg } = useAuth();
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

    </nav>
  );
}
