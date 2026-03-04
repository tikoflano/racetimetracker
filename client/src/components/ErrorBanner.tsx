import { Alert } from '@mantine/core';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  /** When true, removes bottom margin (e.g. when inside a modal) */
  noMargin?: boolean;
}

export default function ErrorBanner({ message, onDismiss, noMargin }: ErrorBannerProps) {
  return (
    <Alert color="red" withCloseButton onClose={onDismiss} mb={noMargin ? 0 : undefined} role="alert">
      {message}
    </Alert>
  );
}
