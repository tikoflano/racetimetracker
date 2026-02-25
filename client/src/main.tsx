import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection } from './module_bindings';
import { AuthProvider } from './auth';
import App from './App';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'PLACEHOLDER';

// SpacetimeDB connection config
// VITE_STDB_ENV=cloud  → connect to maincloud.spacetimedb.com (or custom host)
// VITE_STDB_ENV=local  → connect through Vite proxy to localhost:3000
const stdbEnv = import.meta.env.VITE_STDB_ENV || 'local';
const stdbCloudHost = import.meta.env.VITE_STDB_CLOUD_HOST || 'maincloud.spacetimedb.com';
const stdbDatabase = import.meta.env.VITE_STDB_DATABASE || 'racetimetracker-dev';

const wsUri = stdbEnv === 'cloud'
  ? `wss://${stdbCloudHost}`
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

console.log(`[STDB] env=${stdbEnv} uri=${wsUri} db=${stdbDatabase}`);

// Validate stored token
const storedToken = localStorage.getItem('auth_token');
if (storedToken) {
  try {
    const parts = storedToken.split('.');
    if (parts.length !== 3) throw new Error('not JWT');
    const payload = JSON.parse(atob(parts[1]));
    if ((payload.exp ?? 0) * 1000 < Date.now()) {
      console.log('[STDB] Token expired, clearing');
      localStorage.removeItem('auth_token');
    }
  } catch {
    console.log('[STDB] Invalid token, clearing');
    localStorage.removeItem('auth_token');
  }
}

const validToken = localStorage.getItem('auth_token');

const builder = DbConnection.builder()
  .withUri(wsUri)
  .withDatabaseName(stdbDatabase)
  .onConnect((_conn, identity, _token) => {
    console.log('[STDB] Connected! identity:', identity?.toHexString?.());
  })
  .onConnectError((_conn, err) => {
    console.error('[STDB] Connection error:', err);
  })
  .onDisconnect(() => {
    console.log('[STDB] Disconnected');
  });

if (validToken) {
  builder.withToken(validToken);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <SpacetimeDBProvider connectionBuilder={builder}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </SpacetimeDBProvider>
  </GoogleOAuthProvider>
);
