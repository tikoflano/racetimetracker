import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import TimekeepView from './views/TimekeepView';
import DevView from './views/DevView';
import { FontAwesomeIcon, faBars, faXmark, faRightFromBracket, faArrowRightArrowLeft, faChevronLeft, faChevronRight } from './icons';
import Modal from './components/Modal';
import type { Organization } from './module_bindings/types';

const ACTIVE_ORG_KEY = 'active_org_id';

export default function App() {
  const connState = useSpacetimeDB();
  const { user, realUser, isAuthenticated, isImpersonating, logout, getOrgRole, isOrgOwner } = useAuth();
  const [orgs] = useTable(tables.organization);
  const stopImpersonation = useReducer(reducers.stopImpersonation);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [switchOrgOpen, setSwitchOrgOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
    setAvatarMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!avatarMenuOpen) return;
    const handle = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [avatarMenuOpen]);

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
    return orgs.filter((o: Organization) => getOrgRole(o.id) !== null);
  }, [isAuthenticated, orgs, getOrgRole]);

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
              <FontAwesomeIcon icon={sidebarOpen ? faXmark : faBars} />
            </button>
          )}
          <span className="header-title" style={{ fontWeight: 600, fontSize: '0.9rem' }}>RaceTimeTracker</span>
          {activeOrg && (
            <>
              <span className="header-title" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>/</span>
              <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>{activeOrg.name}</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isAuthenticated ? (
            <div ref={avatarRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                title={user?.name || user?.email || 'User'}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: user?.picture ? 'transparent' : 'var(--accent)',
                  color: 'white', border: 'none',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0, overflow: 'hidden',
                }}
              >
                {user?.picture ? (
                  <img src={user.picture} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                ) : (
                  (user?.name || user?.email || 'U').charAt(0).toUpperCase()
                )}
              </button>
              {avatarMenuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 6,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  minWidth: 220, zIndex: 50, overflow: 'hidden',
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user?.name || 'User'}</div>
                    {user?.email && <div className="muted small-text">{user.email}</div>}
                  </div>
                  {userOrgs.length > 1 && (
                    <AvatarMenuItem icon={faArrowRightArrowLeft} label="Switch organization" onClick={() => { setAvatarMenuOpen(false); setSwitchOrgOpen(true); }} />
                  )}
                  <AvatarMenuItem icon={faRightFromBracket} label="Sign out" danger onClick={() => { setAvatarMenuOpen(false); logout(); }} />
                </div>
              )}
            </div>
          ) : (
            <LoginButton />
          )}
        </div>
      </header>

      {/* Switch org modal */}
      <Modal open={switchOrgOpen} onClose={() => setSwitchOrgOpen(false)} title="Switch Organization">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {userOrgs.map((o: Organization) => {
            const isActive = activeOrg?.id === o.id;
            const role = isOrgOwner(o.id) ? 'owner' : getOrgRole(o.id);
            return (
              <button
                key={String(o.id)}
                onClick={() => { setActiveOrgId(o.id); setSwitchOrgOpen(false); }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 'var(--radius)',
                  border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: isActive ? 'var(--accent-bg, rgba(59,130,246,0.1))' : 'var(--surface)',
                  color: 'var(--text)', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left',
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
                className={`${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}
                activeOrg={activeOrg}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => {
                  const next = !sidebarCollapsed;
                  setSidebarCollapsed(next);
                  localStorage.setItem('sidebar_collapsed', String(next));
                }}
              />
            </>
          )}
          <main className="app-main">
            <OrgProvider value={{ activeOrgId: activeOrgId }}>
              <Routes>
                <Route path="/" element={isAuthenticated ? <Navigate to="/championships" replace /> : <HomePage />} />
                <Route path="/event/:eventSlug" element={<EventView />} />
                <Route path="/event/:eventSlug/manage" element={<EventManageView />} />
                <Route path="/event/:eventSlug/track/:eventTrackId" element={<TrackView />} />
                <Route path="/:orgSlug/event/:eventSlug" element={<EventView />} />
                <Route path="/members" element={<OrgMembersView />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/championships" element={<ChampionshipsView />} />
                <Route path="/championship/:champId" element={<ChampionshipDetailView />} />
                <Route path="/racers" element={<RacersView />} />
                <Route path="/venues" element={<VenuesView />} />
                <Route path="/venue/:venueId" element={<VenueDetailView />} />
                <Route path="/timekeep" element={<TimekeepView />} />
                <Route path="/register/:token" element={<RegisterView />} />
                <Route path="/register/:token/qr" element={<QRCodeView />} />
                <Route path="/dev" element={<DevView />} />
                <Route path="*" element={isAuthenticated ? <NotFound /> : <Navigate to="/" replace />} />
              </Routes>
            </OrgProvider>
          </main>
        </div>
      )}
    </div>
  );
}

function HomePage() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: 8 }}>RaceTimeTracker</div>
      <p className="muted" style={{ marginBottom: 32, fontSize: '1rem' }}>
        Real-time enduro bike race timing. Start and stop timers across the course — everyone sees results instantly.
      </p>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
        <LoginButton />
      </div>
      <p className="muted small-text">Sign in with Google to create events, manage riders, and run races.</p>
    </div>
  );
}

function AvatarMenuItem({ icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
        gap: 10, width: '100%',
        padding: '9px 14px', border: 'none', background: 'none',
        color: danger ? 'var(--red, #ef4444)' : 'var(--text)',
        fontSize: '0.85rem', textAlign: 'left', cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <span style={{ width: 16, textAlign: 'center', flexShrink: 0 }}><FontAwesomeIcon icon={icon} /></span>
      <span>{label}</span>
    </button>
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
