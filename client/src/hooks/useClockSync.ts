import { useState, useEffect, useRef, useCallback } from 'react';
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { ServerTimeResponse } from '../module_bindings/types';

const SYNC_INTERVAL_MS = 30_000; // re-sync every 30s

/**
 * Measures the clock offset between client and SpacetimeDB server.
 * Returns `getCorrectedTime()` which gives `Date.now() + offset`,
 * converting local time to approximate server time.
 *
 * Performs one sync on mount, then re-syncs every 30s.
 */
export function useClockSync() {
  const connState = useSpacetimeDB();
  const identity = connState.identity;
  const [responses] = useTable(tables.server_time_response);
  const getServerTime = useReducer(reducers.getServerTime);

  // offset = serverTime - localTime (add to Date.now() to get server time)
  const [offset, setOffset] = useState<number>(0);
  const [synced, setSynced] = useState(false);

  // Track pending request
  const pendingRef = useRef<{ requestId: bigint; sentAt: number } | null>(null);
  const requestCounterRef = useRef(0);

  const doSync = useCallback(() => {
    if (!connState.isActive) return;
    const requestId = BigInt(++requestCounterRef.current);
    const sentAt = Date.now();
    pendingRef.current = { requestId, sentAt };
    getServerTime({ requestId }).catch(() => {
      // Reducer call failed — clear pending so we retry next interval
      pendingRef.current = null;
    });
  }, [connState.isActive, getServerTime]);

  // Watch for matching response
  useEffect(() => {
    if (!pendingRef.current || !identity) return;
    const { requestId, sentAt } = pendingRef.current;

    const match = responses.find(
      (r: ServerTimeResponse) => r.identity.isEqual(identity) && r.requestId === requestId
    );
    if (!match) return;

    const receivedAt = Date.now();
    const rtt = receivedAt - sentAt;
    const serverTime = Number(match.serverTime);
    // Estimate: server processed at sentAt + rtt/2
    const estimatedOffset = serverTime - (sentAt + rtt / 2);

    setOffset(estimatedOffset);
    setSynced(true);
    pendingRef.current = null;
  }, [responses, identity]);

  // Initial sync + periodic re-sync
  useEffect(() => {
    if (!connState.isActive) return;

    // Small delay to let the subscription establish
    const initialTimer = setTimeout(doSync, 500);

    const interval = setInterval(doSync, SYNC_INTERVAL_MS);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [connState.isActive, doSync]);

  const getCorrectedTime = useCallback((): bigint => {
    return BigInt(Math.round(Date.now() + offset));
  }, [offset]);

  return { getCorrectedTime, offset, synced };
}
