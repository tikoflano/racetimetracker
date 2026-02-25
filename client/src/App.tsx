import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables } from './module_bindings';
import { useAuth } from './auth';
import LoginButton from './components/LoginButton';
import Sidebar from './components/Sidebar';
import { EventViewSkeleton } from './components/Skeleton';
import EventView from './views/EventView';
import TrackView from './views/TrackView';
import OrgMembersView from './views/OrgMembersView';
import ChampionshipsView from './views/ChampionshipsView';
import ChampionshipDetailView from './views/ChampionshipDetailView';
import CalendarView from './views/CalendarView';
import RacersView from './views/RacersView';
import VenuesView from './views/VenuesView';
import VenueDetailView from './views/VenueDetailView';
import EventManageView from './views/EventManageView';
import RegisterView from './views/RegisterView';
import QRCodeView from './views/QRCodeView';
import type { Organization } from './module_bindings/types';

export default function App() {
  const connState = useSpacetimeDB();
  const { user, realUser, isAuthenticated, isImpersonating, logout } = useAuth();
  const [events] = useTable(tables.event);
  const [orgs] = useTable(tables.organization);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const isConnected = connState.isActive;
  const hasEvents = events.length > 0;
  const showSkeleton = !timedOut && !isConnected;

  const defaultEventId = hasEvents ? events[0].id : null;

  // Find the user's own org (for redirect when they have no events)
  const userOrg = useMemo(() => {
    if (!user) return null;
    return orgs.find((o: Organization) => o.ownerUserId === user.id) ?? null;
  }, [user, orgs]);

  if (showSkeleton) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>RaceTimeTracker</span>
          <span className="muted small-text">Connecting...</span>
        </header>
        <div className="app-body">
          <main className="app-main">
            <EventViewSkeleton />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isAuthenticated && (
            <button
              className="ghost small menu-toggle"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? '\u2715' : '\u2630'}
            </button>
          )}
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>RaceTimeTracker</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isAuthenticated ? (
            <>
              <span className="small-text">{user?.name || user?.email || 'User'}</span>
              <button className="ghost small" onClick={logout}>Sign out</button>
            </>
          ) : (
            <LoginButton />
          )}
        </div>
      </header>

      {isImpersonating && user && realUser && (
        <div className="impersonation-banner">
          Viewing as: <strong>{user.name || user.email}</strong>
          <span className="muted" style={{ marginLeft: 4 }}>(ID: {String(user.id)})</span>
        </div>
      )}

      {!isConnected ? (
        <div className="app-body">
          <main className="app-main">
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ marginBottom: 8 }}>Unable to connect to the server.</p>
              <button className="primary" onClick={() => window.location.reload()}>Retry</button>
            </div>
          </main>
        </div>
      ) : (
        <div className="app-body">
          {isAuthenticated && (
            <>
              {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
              <Sidebar className={sidebarOpen ? 'open' : ''} />
            </>
          )}
          <main className="app-main">
            <Routes>
              <Route
                path="/"
                element={
                  defaultEventId !== null ? (
                    <Navigate to={`/event/${defaultEventId}`} replace />
                  ) : userOrg ? (
                    <Navigate to={`/org/${userOrg.id}/members`} replace />
                  ) : (
                    <div className="empty">No events found. Sign in to get started.</div>
                  )
                }
              />
              <Route path="/event/:eventId" element={<EventView />} />
              <Route path="/event/:eventId/manage" element={<EventManageView />} />
              <Route path="/event/:eventId/track/:eventTrackId" element={<TrackView />} />
              <Route path="/org/:orgId/members" element={<OrgMembersView />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/org/:orgId/championships" element={<ChampionshipsView />} />
              <Route path="/org/:orgId/championship/:champId" element={<ChampionshipDetailView />} />
              <Route path="/org/:orgId/racers" element={<RacersView />} />
              <Route path="/org/:orgId/venues" element={<VenuesView />} />
              <Route path="/org/:orgId/venue/:venueId" element={<VenueDetailView />} />
              <Route path="/register/:token" element={<RegisterView />} />
              <Route path="/register/:token/qr" element={<QRCodeView />} />
            </Routes>
          </main>
        </div>
      )}
    </div>
  );
}
