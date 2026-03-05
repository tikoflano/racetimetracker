import { Container, Title, Text } from '@mantine/core';
import { useSpacetimeDB } from 'spacetimedb/react';
import ConnectionIndicator from './components/ConnectionIndicator';

export default function App() {
  const connState = useSpacetimeDB();
  const isConnected = connState.isActive;

  return (
    <Container size="sm" py="xl">
      <Title order={1} mb="xs">
        RaceTimeTracker client2
      </Title>
      <Text c="dimmed" mb="md">
        New Mantine client — features will be ported incrementally.
      </Text>
      <ConnectionIndicator isConnected={isConnected} />
    </Container>
  );
}
