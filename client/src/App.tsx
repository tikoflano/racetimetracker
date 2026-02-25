import { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from './module_bindings';
import { useAuth } from './auth';
import { OrgProvider } from './OrgContext';
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

const ACTIVE_ORG_KEY = 'active_org_id';

export default function App() {
  const connState = useSpacetimeDB();
  const { user, realUser, isAuthenticated, isImpersonating, logout, canManageOrgEvents } = useAuth();
  const [orgs] = useTable(tables.organization);
  const stopImpersonation = useReducer(reducers.stopImpersonation);

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

  // Active org state (persisted to localStorage)
  const [activeOrgId, setActiveOrgIdRaw] = useState<bigint | null>(() => {
    const stored = localStorage.getItem(ACTIVE_ORG_KEY);
    return stored ? BigInt(stored) : null;
  });

  const setActiveOrgId = useCallback((id: bigint) => {
    localStorage.setItem(ACTIVE_ORG_KEY, String(id));
    setActiveOrgIdRaw(id);
  }, []);

  const userOrgs = useMemo(() => {
    if (!isAuthenticated) return [];
    return orgs.filter((o: Organization) => canManageOrgEvents(o.id));
  }, [isAuthenticated, orgs, canManageOrgEvents]);

  // Auto-select org if none selected or current is invalid
  useEffect(() => {
    if (userOrgs.length === 0) return;
    if (activeOrgId && userOrgs.some((o: Organization) => o.id === activeOrgId)) return;
    setActiveOrgId(userOrgs[0].id);
  }, [userOrgs, activeOrgId, setActiveOrgId]);

  const activeOrg = useMemo(() => {
    if (!activeOrgId) return null;
    return userOrgs.find((o: Organization) => o.id === activeOrgId) ?? null;
  }, [activeOrgId, userOrgs]);

  const isConnected = connState.isActive;
  const showSkeleton = !timedOut && !isConnected;

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
          {activeOrg && (
            <>
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>/</span>
              <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>{activeOrg.name}</span>
            </>
          )}
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
          <span>
            Viewing as: <strong>{user.name || user.email}</strong>
          </span>
          <button onClick={() => stopImpersonation()} style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 'var(--radius)',
            padding: '2px 10px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}>
            Stop
          </button>
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
              <Sidebar
                className={sidebarOpen ? 'open' : ''}
                activeOrg={activeOrg}
                userOrgs={userOrgs}
                onSwitchOrg={setActiveOrgId}
              />
            </>
          )}
          <main className="app-main">
            <OrgProvider value={{ activeOrgId: activeOrgId }}>
              <Routes>
                <Route path="/" element={<Navigate to="/championships" replace />} />
                <Route path="/event/:eventId" element={<EventView />} />
                <Route path="/event/:eventId/manage" element={<EventManageView />} />
                <Route path="/event/:eventId/track/:eventTrackId" element={<TrackView />} />
                <Route path="/members" element={<OrgMembersView />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/championships" element={<ChampionshipsView />} />
                <Route path="/championship/:champId" element={<ChampionshipDetailView />} />
                <Route path="/racers" element={<RacersView />} />
                <Route path="/venues" element={<VenuesView />} />
                <Route path="/venue/:venueId" element={<VenueDetailView />} />
                <Route path="/register/:token" element={<RegisterView />} />
                <Route path="/register/:token/qr" element={<QRCodeView />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </OrgProvider>
          </main>
        </div>
      )}
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: '4rem', fontWeight: 700, opacity: 0.2, marginBottom: 8 }}>404</div>
      <h2 style={{ marginBottom: 8 }}>Page not found</h2>
      <p className="muted" style={{ marginBottom: 20 }}>The page you're looking for doesn't exist.</p>
      <a href="/" className="primary" style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 'var(--radius)', textDecoration: 'none' }}>
        Go home
      </a>
    </div>
  );
}
