import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Text, Title } from '@mantine/core';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <Box
          p="xl"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Title order={2} mb="xs">
            Something went wrong
          </Title>
          <Text c="dimmed" mb="md" size="sm">
            {this.state.error.message}
          </Text>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
