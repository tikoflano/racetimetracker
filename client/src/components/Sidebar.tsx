import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { IS_DEV } from '../env';
import { FontAwesomeIcon, faThumbtack } from '../icons';
import type { Event, Organization, PinnedEvent } from '../module_bindings/types';

interface SidebarProps {
  className?: string;
  activeOrg: Organization | null;
}

export default function Sidebar({ className = '', activeOrg }: SidebarProps) {
  const { user, isAuthenticated, canManageOrg, canManageOrgEvents } = useAuth();
  const [events] = useTable(tables.event);
  const [pinnedEvents] = useTable(tables.pinned_event);

  const togglePin = useReducer(reducers.togglePinEvent);

  const pinnedEventIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(
      pinnedEvents.filter((f: PinnedEvent) => f.userId === user.id).map(f => f.eventId)
    );
  }, [user, pinnedEvents]);

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
                <FontAwesomeIcon icon={faThumbtack} />
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

    </nav>
  );
}
