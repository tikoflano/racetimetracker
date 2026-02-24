import { NavLink } from 'react-router-dom';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import { useAuth } from '../auth';
import type { Event, Organization } from '../module_bindings/types';

export default function Sidebar() {
  const { user, isAuthenticated, canManageOrg } = useAuth();
  const [events] = useTable(tables.event);
  const [orgs] = useTable(tables.organization);

  // Orgs the user can manage (owner or admin) + unclaimed orgs
  const managedOrgs = isAuthenticated
    ? orgs.filter((o: Organization) => canManageOrg(o.id) || o.ownerUserId === 0n)
    : [];

  return (
    <nav className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">Events</div>
        {events.length === 0 ? (
          <div className="sidebar-empty">No events</div>
        ) : (
          events.map((e: Event) => (
            <NavLink
              key={String(e.id)}
              to={`/event/${e.id}`}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {e.name}
            </NavLink>
          ))
        )}
      </div>

      {managedOrgs.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-label">Manage</div>
          {managedOrgs.map((o: Organization) => (
            <NavLink
              key={String(o.id)}
              to={`/org/${o.id}/members`}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {o.name}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
