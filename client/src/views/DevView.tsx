import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useReducer } from 'spacetimedb/react';
import { reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { IS_DEV } from '../env';

export default function DevView() {
  const { isAuthenticated, isReady } = useAuth();
  const seedDemoData = useReducer(reducers.seedDemoData);
  const [status, setStatus] = useState<string | null>(null);

  if (!IS_DEV) return <Navigate to="/" replace />;
  if (!isReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  const handleSeed = async () => {
    setStatus(null);
    try {
      await seedDemoData();
      setStatus('Demo data loaded successfully.');
    } catch (e: any) {
      setStatus(`Error: ${e?.message || 'Failed to seed data'}`);
    }
  };

  return (
    <div>
      <h1>Developer Tools</h1>
      <p className="muted small-text" style={{ marginBottom: 20 }}>
        These tools are only available in development mode.
      </p>

      <div className="section">
        <div className="section-title">Data</div>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 500 }}>Seed Demo Data</div>
            <div className="muted small-text">Creates sample championships, venues, events, riders, and org members.</div>
          </div>
          <button className="primary" onClick={handleSeed}>Seed</button>
        </div>
        {status && (
          <div style={{
            marginTop: 8,
            padding: '8px 12px',
            borderRadius: 'var(--radius)',
            fontSize: '0.85rem',
            background: status.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            color: status.startsWith('Error') ? 'var(--red, #ef4444)' : 'var(--green, #22c55e)',
          }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
