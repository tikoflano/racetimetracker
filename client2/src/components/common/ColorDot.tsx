import { Box } from '@mantine/core';

interface ColorDotProps {
  color: string;
  size?: number;
}

export function ColorDot({ color, size = 10 }: ColorDotProps) {
  return (
    <Box w={size} h={size} style={{ borderRadius: '50%', background: color, flexShrink: 0 }} />
  );
}
