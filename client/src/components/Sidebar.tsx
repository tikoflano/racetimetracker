import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import type { Event, Organization, FavoriteEvent } from '../module_bindings/types';

export default function Sidebar() {
  const { user, isAuthenticated, canManageOrg } = useAuth();
  const [events] = useTable(tables.event);
  const [orgs] = useTable(tables.organization);
  const [favorites] = useTable(tables.favorite_event);

  const toggleFavorite = useReducer(reducers.toggleFavoriteEvent);

  // Orgs the user can manage (owner or admin/manager)
  const managedOrgs = isAuthenticated
    ? orgs.filter((o: Organization) => canManageOrg(o.id))
    : [];

  // IDs of orgs the user owns
  const userOrgIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(orgs.filter((o: Organization) => o.ownerUserId === user.id).map(o => o.id));
  }, [user, orgs]);

  // User's favorited event IDs
  const favEventIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(
      favorites.filter((f: FavoriteEvent) => f.userId === user.id).map(f => f.eventId)
    );
  }, [user, favorites]);

  // Events from user's org(s), favorites first
  const filteredEvents = useMemo(() => {
    const orgEvents = events.filter((e: Event) => userOrgIds.has(e.orgId));
    return [...orgEvents].sort((a, b) => {
      const aFav = favEventIds.has(a.id) ? 0 : 1;
      const bFav = favEventIds.has(b.id) ? 0 : 1;
      return aFav - bFav;
    });
  }, [events, userOrgIds, favEventIds]);

  return (
    <nav className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">Events</div>
        {filteredEvents.length === 0 ? (
          <div className="sidebar-empty">No events</div>
        ) : (
          filteredEvents.map((e: Event) => (
            <div key={String(e.id)} className="sidebar-event-row">
              <NavLink
                to={`/event/${e.id}`}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                {e.name}
              </NavLink>
              {isAuthenticated && (
                <button
                  className="fav-btn"
                  onClick={() => toggleFavorite({ eventId: e.id })}
                  title={favEventIds.has(e.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {favEventIds.has(e.id) ? '\u2605' : '\u2606'}
                </button>
              )}
            </div>
          ))
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
