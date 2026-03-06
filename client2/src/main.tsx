import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection } from './module_bindings';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { theme } from './theme';
import '@mantine/core/styles.css';
import 'mantine-datatable/styles.css';
import './index.css';

// SpacetimeDB connection config
// VITE_STDB_ENV=cloud  → connect to maincloud.spacetimedb.com
// VITE_STDB_ENV=local  → connect through Vite proxy to localhost:3000
const stdbEnv = import.meta.env.VITE_STDB_ENV || 'local';
const stdbCloudHost = import.meta.env.VITE_STDB_CLOUD_HOST || 'maincloud.spacetimedb.com';
const stdbDatabase = import.meta.env.VITE_STDB_DATABASE || 'racetimetracker-dev';

const wsUri =
  stdbEnv === 'cloud'
    ? `wss://${stdbCloudHost}`
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

console.log(`[STDB] env=${stdbEnv} uri=${wsUri} db=${stdbDatabase}`);

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SpacetimeDBProvider connectionBuilder={builder}>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </MantineProvider>
  </SpacetimeDBProvider>
);
