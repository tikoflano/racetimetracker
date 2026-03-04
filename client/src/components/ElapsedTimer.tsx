import { useState, useEffect } from 'react';
import { Text } from '@mantine/core';
import { formatElapsed } from '../utils';

interface Props {
  startTime: number;
  size?: 'sm' | 'lg';
  dnf?: boolean;
}

export default function ElapsedTimer({ startTime, size = 'sm', dnf }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(interval);
  }, []);

  const elapsed = now - startTime;
  return (
    <Text
      ff="monospace"
      fw={600}
      c={dnf ? 'red' : 'green'}
      size={size === 'lg' ? '2.5rem' : '1.1rem'}
    >
      {formatElapsed(elapsed)}
    </Text>
  );
}
