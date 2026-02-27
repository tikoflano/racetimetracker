/**
 * Extract a user-facing error message from a caught value.
 * Handles Error instances and objects with a message property.
 */
export function getErrorMessage(e: unknown, fallback = 'An error occurred'): string {
  if (e instanceof Error) return e.message;
  if (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message;
  }
  return fallback;
}

export function formatElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}
