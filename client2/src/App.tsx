import { Box, Text, Title } from '@mantine/core';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSpacetimeDB } from 'spacetimedb/react';
import { useAuth } from './auth';
import ConnectionIndicator from './components/ConnectionIndicator';
import LoginPage from './views/LoginPage';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const connState = useSpacetimeDB();
  const isConnected = connState.isActive;

  if (!isConnected) {
    return (
      <Box
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Title order={2} mb="xs">
          Connecting…
        </Title>
        <Text c="dimmed" mb="md">
          Unable to reach the server. Check that SpacetimeDB is running.
        </Text>
        <ConnectionIndicator isConnected={false} />
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <HomePage /> : <LoginPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function HomePage() {
  const connState = useSpacetimeDB();
  const isConnected = connState.isActive;

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Title order={1} mb="xs">
        RaceTimeTracker
      </Title>
      <Text c="dimmed" mb="md">
        You're signed in. More features coming soon.
      </Text>
      <ConnectionIndicator isConnected={isConnected} />
    </Box>
  );
}

export default function App() {
  return <AppContent />;
}
