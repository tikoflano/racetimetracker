import { FontAwesomeIcon, faXmark } from '../icons';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  /** When true, removes bottom margin (e.g. when inside a modal) */
  noMargin?: boolean;
}

export default function ErrorBanner({ message, onDismiss, noMargin }: ErrorBannerProps) {
  return (
    <div
      className="error-banner"
      role="alert"
      style={noMargin ? { marginBottom: 0 } : undefined}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button
        type="button"
        className="error-banner-dismiss"
        onClick={onDismiss}
        title="Dismiss"
        aria-label="Dismiss"
      >
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
}
