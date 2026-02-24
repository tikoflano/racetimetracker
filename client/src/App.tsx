import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables } from './module_bindings';
import { useAuth } from './auth';
import LoginButton from './components/LoginButton';
import { EventViewSkeleton } from './components/Skeleton';
import EventView from './views/EventView';
import TrackView from './views/TrackView';

export default function App() {
  const connState = useSpacetimeDB();
  const { user, isAuthenticated, logout } = useAuth();
  const [events] = useTable(tables.event);

  // Timeout fallback: if connection takes too long, show content anyway
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const isConnected = connState.isActive;
  const hasEvents = events.length > 0;
  const showSkeleton = !timedOut && !isConnected;

  useEffect(() => {
    console.log('[App] isActive:', isConnected, 'events:', events.length, 'timedOut:', timedOut);
  }, [isConnected, events.length, timedOut]);

  const defaultEventId = hasEvents ? events[0].id : null;

  if (showSkeleton) {
    return (
      <div>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="connection-bar" style={{ marginBottom: 0 }}>
            <span className="dot" />
            Connecting...
          </div>
        </header>
        <EventViewSkeleton />
      </div>
    );
  }

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="connection-bar" style={{ marginBottom: 0 }}>
          <span className={`dot ${isConnected ? 'on' : ''}`} />
          {isConnected ? 'Connected' : 'Connection failed'}
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

      {!isConnected ? (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ marginBottom: 8 }}>Unable to connect to the server.</p>
          <button className="primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <Routes>
          <Route
            path="/"
            element={
              defaultEventId !== null ? (
                <Navigate to={`/event/${defaultEventId}`} replace />
              ) : (
                <div className="empty">No events found.</div>
              )
            }
          />
          <Route path="/event/:eventId" element={<EventView />} />
          <Route path="/event/:eventId/track/:eventTrackId" element={<TrackView />} />
        </Routes>
      )}
    </div>
  );
}
