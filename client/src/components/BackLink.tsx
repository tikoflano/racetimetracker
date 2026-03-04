import { Link } from 'react-router-dom';
import { Anchor } from '@mantine/core';

interface BackLinkProps {
  to: string;
  children: React.ReactNode;
}

export default function BackLink({ to, children }: BackLinkProps) {
  return (
    <Anchor component={Link} to={to} size="sm" c="dimmed" mb="md" underline="never">
      {children}
    </Anchor>
  );
}
