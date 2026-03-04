import { Identity } from 'spacetimedb';

export function placeholderIdentity(email: string): Identity {
  let hash = 1n;
  for (let i = 0; i < email.length; i++) {
    hash = hash * 31n + BigInt(email.charCodeAt(i));
  }
  return new Identity(hash);
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}

// Parse YYYY-MM-DD to start of day (ms UTC)
export function parseEventDateStart(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.getTime();
}

// Parse YYYY-MM-DD to end of day (ms UTC)
export function parseEventDateEnd(dateStr: string): number {
  const d = new Date(dateStr + 'T23:59:59.999Z');
  return d.getTime();
}

// Validates a client-supplied timestamp: must be within 10s of server time.
// Returns the client time if valid, otherwise falls back to server time.
export function resolveClientTime(clientTime: bigint): bigint {
  const serverNow = BigInt(Date.now());
  if (clientTime === 0n) return serverNow;
  const diff = serverNow > clientTime ? serverNow - clientTime : clientTime - serverNow;
  if (diff > 10000n) return serverNow; // >10s drift, ignore client time
  return clientTime;
}
