import { Box, Paper, Stack, Text, Title } from '@mantine/core';
import LoginButton from '../components/LoginButton';
import ConnectionIndicator from '../components/ConnectionIndicator';
import { useSpacetimeDB } from 'spacetimedb/react';

export default function LoginPage() {
  const { isActive: isConnected } = useSpacetimeDB();

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background:
          'linear-gradient(180deg, var(--mantine-color-dark-8) 0%, var(--mantine-color-dark-9) 100%)',
      }}
    >
      <Paper
        p="xl"
        radius="lg"
        withBorder
        bg="dark.7"
        style={{
          maxWidth: 420,
          width: '100%',
          borderColor: 'var(--mantine-color-blue-8)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <Stack align="center" gap="lg">
          <Text style={{ fontSize: 64, lineHeight: 1 }} aria-hidden>
            🚴
          </Text>
          <Title order={1} ta="center" size="2rem" fw={700}>
            RaceTimeTracker
          </Title>
          <Text c="dimmed" ta="center" size="md" maw={320}>
            Real-time enduro bike race timing. Sign in to create events, manage riders, and run
            races.
          </Text>
          <Box pt="xs">
            <LoginButton />
          </Box>
        </Stack>
      </Paper>
      <ConnectionIndicator isConnected={isConnected} margin={24} />
    </Box>
  );
}
