import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTable } from 'spacetimedb/react';
import { Badge, Text } from '@mantine/core';
import { tables } from '../module_bindings';
import type {
  Event,
  EventTrack,
  Rider,
  EventRider,
  Organization,
  EventCategory,
} from '../module_bindings/types';
import { formatElapsed } from '../utils';

const PAUSE_AT_TOP_SECONDS = 3;
const PAUSE_AT_BOTTOM_SECONDS = 2;
const PAUSE_INACTIVITY_SECONDS = 3;
const SCROLL_SPEED_PX_PER_SEC = 80;

export default function LeaderboardView() {
  const { eventSlug, orgSlug } = useParams<{ eventSlug: string; orgSlug?: string }>();
  const [events] = useTable(tables.event);
  const [orgs] = useTable(tables.organization);
  const [eventTracks] = useTable(tables.event_track);
  const [runs] = useTable(tables.run);
  const [riders] = useTable(tables.rider);
  const [eventRiders] = useTable(tables.event_rider);
  const [eventCategories] = useTable(tables.event_category);

  const event = useMemo(() => {
    if (!eventSlug) return null;
    if (orgSlug) {
      const org = orgs.find((o: Organization) => o.slug === orgSlug);
      if (!org) return null;
      return events.find((e: Event) => e.slug === eventSlug && e.orgId === org.id) ?? null;
    }
    return events.find((e: Event) => e.slug === eventSlug) ?? null;
  }, [eventSlug, orgSlug, events, orgs]);

  const eid = event?.id ?? 0n;

  const sortedEventTracks = useMemo(() => {
    return [...eventTracks]
      .filter((et: EventTrack) => et.eventId === eid)
      .sort((a: EventTrack, b: EventTrack) => a.sortOrder - b.sortOrder);
  }, [eventTracks, eid]);

  const eventRiderIds = useMemo(() => {
    return new Set(
      eventRiders.filter((er: EventRider) => er.eventId === eid).map((er: EventRider) => er.riderId)
    );
  }, [eventRiders, eid]);

  const riderMap = useMemo(() => {
    const m = new Map<bigint, Rider>();
    for (const r of riders) m.set(r.id, r);
    return m;
  }, [riders]);

  type LeaderboardEntry = {
    riderId: bigint;
    rider?: Rider;
    total: number;
    complete: boolean;
    dnf: boolean;
    trackCount: number;
  };

  const riderToCategory = useMemo(() => {
    const m = new Map<bigint, bigint>();
    for (const er of eventRiders) {
      if ((er as EventRider).eventId !== eid) continue;
      m.set((er as EventRider).riderId, (er as EventRider).categoryId);
    }
    return m;
  }, [eventRiders, eid]);

  const categoriesForEvent = useMemo(() => {
    return [...eventCategories]
      .filter((c: EventCategory) => c.eventId === eid)
      .sort((a: EventCategory, b: EventCategory) => a.numberRangeStart - b.numberRangeStart);
  }, [eventCategories, eid]);

  const riderNumberMap = useMemo(() => {
    const m = new Map<string, number | null>();
    const catStartMap = new Map<bigint, number>();
    for (const c of eventCategories)
      catStartMap.set((c as EventCategory).id, (c as EventCategory).numberRangeStart);
    for (const er of eventRiders) {
      const e = er as EventRider;
      if (e.eventId !== eid) continue;
      const num =
        e.assignedNumber !== 0
          ? e.assignedNumber
          : e.categoryId !== 0n
            ? (catStartMap.get(e.categoryId) ?? null)
            : null;
      m.set(`${e.eventId}-${e.riderId}`, num);
    }
    return m;
  }, [eventRiders, eventCategories, eid]);

  const getRiderNumber = (riderId: bigint) => riderNumberMap.get(`${eid}-${riderId}`);

  const leaderboardByCategory = useMemo(() => {
    const etIds = new Set(sortedEventTracks.map((et: EventTrack) => et.id));
    const totalTracks = sortedEventTracks.length;
    const riderData = new Map<bigint, { total: number; trackCount: number; dnf: boolean }>();

    for (const run of runs) {
      if (!etIds.has(run.eventTrackId)) continue;
      if (!eventRiderIds.has(run.riderId)) continue;

      const entry = riderData.get(run.riderId) ?? { total: 0, trackCount: 0, dnf: false };
      const elapsed = run.status === 'finished' ? Number(run.endTime) - Number(run.startTime) : 0;

      if (run.status === 'finished') {
        entry.total += elapsed;
        entry.trackCount++;
      } else if (run.status === 'dnf') {
        entry.dnf = true;
      }
      riderData.set(run.riderId, entry);
    }

    const toEntry = (
      riderId: bigint,
      data: { total: number; trackCount: number; dnf: boolean }
    ): LeaderboardEntry => ({
      riderId,
      rider: riderMap.get(riderId),
      total: data.total,
      complete: data.trackCount === totalTracks && !data.dnf,
      dnf: data.dnf,
      trackCount: data.trackCount,
    });

    const sortEntries = (entries: LeaderboardEntry[]) =>
      [...entries].sort((a, b) => {
        if (a.complete && !b.complete) return -1;
        if (!a.complete && b.complete) return 1;
        if (a.complete && b.complete) return a.total - b.total;
        if (a.dnf && !b.dnf) return 1;
        if (!a.dnf && b.dnf) return -1;
        if (a.trackCount !== b.trackCount) return b.trackCount - a.trackCount;
        return a.total - b.total;
      });

    const result: { categoryId: bigint; categoryName: string; entries: LeaderboardEntry[] }[] = [];

    if (categoriesForEvent.length === 0) {
      const entries = [...riderData.entries()].map(([riderId, data]) => toEntry(riderId, data));
      result.push({ categoryId: 0n, categoryName: '', entries: sortEntries(entries) });
      return result;
    }

    for (const cat of categoriesForEvent) {
      const riderIdsInCat = [...riderToCategory.entries()]
        .filter(([, cid]) => cid === cat.id)
        .map(([rid]) => rid);
      const entries = riderIdsInCat
        .filter((rid) => riderData.has(rid))
        .map((rid) => toEntry(rid, riderData.get(rid)!));
      if (entries.length > 0) {
        result.push({ categoryId: cat.id, categoryName: cat.name, entries: sortEntries(entries) });
      }
    }

    const uncatRiderIds = [...riderToCategory.entries()]
      .filter(([, cid]) => cid === 0n)
      .map(([rid]) => rid);
    const uncatEntries = uncatRiderIds
      .filter((rid) => riderData.has(rid))
      .map((rid) => toEntry(rid, riderData.get(rid)!));
    if (uncatEntries.length > 0) {
      result.push({ categoryId: 0n, categoryName: 'Other', entries: sortEntries(uncatEntries) });
    }

    return result;
  }, [runs, sortedEventTracks, eventRiderIds, riderMap, riderToCategory, categoriesForEvent]);

  const [categoryIndex, setCategoryIndex] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const currentCategory = leaderboardByCategory[categoryIndex];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Auto-scroll: 3s pause at top → scroll to bottom (variable time) → 2s pause at bottom → next category
  // User scroll cancels auto-scroll; switching categories restarts it
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !currentCategory || currentCategory.entries.length === 0) return;
    if (leaderboardByCategory.length === 0) return;

    isProgrammaticScrollRef.current = true;
    el.scrollTop = 0;
    setScrollProgress(0);
    cancelledRef.current = false;
    timeoutsRef.current = [];

    const goToNext = () => {
      if (cancelledRef.current) return;
      if (leaderboardByCategory.length > 1) {
        setCategoryIndex((i) => (i + 1) % leaderboardByCategory.length);
      } else {
        setCycleKey((k) => k + 1);
      }
    };

    const cancelAutoScroll = () => {
      cancelledRef.current = true;
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll > 0) {
        setScrollProgress((el.scrollTop / maxScroll) * 100);
      }
    };

    const scheduleResume = () => {
      const t = setTimeout(() => {
        cancelledRef.current = false;
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll <= 0) {
          setScrollProgress(100);
          const t2 = setTimeout(goToNext, PAUSE_AT_BOTTOM_SECONDS * 1000);
          timeoutsRef.current.push(t2);
          return;
        }
        const startScroll = el.scrollTop;
        const distance = maxScroll - startScroll;
        if (distance <= 0) {
          setScrollProgress(100);
          const t2 = setTimeout(goToNext, PAUSE_AT_BOTTOM_SECONDS * 1000);
          timeoutsRef.current.push(t2);
          return;
        }
        const scrollDurationMs = (distance / SCROLL_SPEED_PX_PER_SEC) * 1000;
        const startTime = performance.now();
        const animate = (now: number) => {
          if (cancelledRef.current) return;
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / scrollDurationMs);
          isProgrammaticScrollRef.current = true;
          el.scrollTop = startScroll + distance * progress;
          setScrollProgress(((startScroll + distance * progress) / maxScroll) * 100);
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setScrollProgress(100);
            const t2 = setTimeout(goToNext, PAUSE_AT_BOTTOM_SECONDS * 1000);
            timeoutsRef.current.push(t2);
          }
        };
        requestAnimationFrame(animate);
      }, PAUSE_INACTIVITY_SECONDS * 1000);
      timeoutsRef.current.push(t);
    };

    const onScroll = () => {
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }
      cancelAutoScroll();
      scheduleResume();
    };

    const onUserScrollIntent = () => {
      cancelAutoScroll();
      scheduleResume();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('wheel', onUserScrollIntent, { passive: true });
    el.addEventListener('touchstart', onUserScrollIntent, { passive: true });

    // Phase 1: pause 3s at top
    const t1 = setTimeout(() => {
      if (cancelledRef.current) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) {
        setScrollProgress(100);
        const t = setTimeout(goToNext, PAUSE_AT_BOTTOM_SECONDS * 1000);
        timeoutsRef.current.push(t);
        return;
      }

      // Phase 2: scroll to bottom (duration = distance / speed)
      const scrollDurationMs = (maxScroll / SCROLL_SPEED_PX_PER_SEC) * 1000;
      const startTime = performance.now();

      const animate = (now: number) => {
        if (cancelledRef.current) return;
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / scrollDurationMs);
        isProgrammaticScrollRef.current = true;
        el.scrollTop = maxScroll * progress;
        setScrollProgress(progress * 100);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setScrollProgress(100);
          const t = setTimeout(goToNext, PAUSE_AT_BOTTOM_SECONDS * 1000);
          timeoutsRef.current.push(t);
        }
      };
      requestAnimationFrame(animate);
    }, PAUSE_AT_TOP_SECONDS * 1000);
    timeoutsRef.current.push(t1);

    return () => {
      cancelledRef.current = true;
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('wheel', onUserScrollIntent);
      el.removeEventListener('touchstart', onUserScrollIntent);
      timeoutsRef.current.forEach((t) => clearTimeout(t));
    };
  }, [categoryIndex, cycleKey, currentCategory, leaderboardByCategory.length]);

  if (!event) {
    return (
      <div
        className="leaderboard-fullscreen"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div style={{ textAlign: 'center', padding: 48 }}>
          {events.length === 0 ? (
            <p style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>Loading...</p>
          ) : (
            <>
              <div style={{ fontSize: '3rem', fontWeight: 700, opacity: 0.3, marginBottom: 16 }}>
                404
              </div>
              <p style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>Event not found</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-fullscreen">
      {(currentCategory?.entries.length ?? 0) > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'var(--border)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${scrollProgress}%`,
              background: 'var(--accent)',
            }}
          />
        </div>
      )}
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(24px, 4vw, 48px)',
          boxSizing: 'border-box',
          minHeight: 0,
        }}
      >
        <header style={{ marginBottom: 'clamp(12px, 2vw, 24px)', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              marginBottom: 8,
              letterSpacing: '-0.02em',
            }}
          >
            {event.name}
          </h1>
          {currentCategory?.categoryName && (
            <p
              style={{
                fontSize: 'clamp(1.25rem, 3vw, 2rem)',
                color: 'var(--accent)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {currentCategory.categoryName}
            </p>
          )}
        </header>

        <main
          ref={scrollContainerRef}
          className="leaderboard-scroll-area"
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {!currentCategory || currentCategory.entries.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
              }}
            >
              No results yet.
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                maxWidth: 900,
                margin: '0 auto',
                borderCollapse: 'collapse',
                fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th
                    style={{
                      width: 80,
                      padding: '16px 12px',
                      textAlign: 'left',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Pos
                  </th>
                  <th
                    style={{
                      width: 60,
                      padding: '16px 12px',
                      textAlign: 'left',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      padding: '16px 12px',
                      textAlign: 'left',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Rider
                  </th>
                  <th
                    style={{
                      width: 80,
                      padding: '16px 12px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Runs
                  </th>
                  <th
                    style={{
                      width: 120,
                      padding: '16px 12px',
                      textAlign: 'right',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentCategory.entries.map((entry, idx) => {
                  const pos = idx + 1;
                  const posClass =
                    pos === 1
                      ? 'position p1'
                      : pos === 2
                        ? 'position p2'
                        : pos === 3
                          ? 'position p3'
                          : '';
                  return (
                    <tr
                      key={String(entry.riderId)}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td style={{ padding: 'clamp(12px, 2vw, 20px) 12px' }}>
                        <span
                          className={posClass}
                          style={{
                            fontSize: pos <= 3 ? '1.2em' : '1em',
                            fontWeight: pos <= 3 ? 700 : 500,
                          }}
                        >
                          {entry.complete ? pos : '-'}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: 'clamp(12px, 2vw, 20px) 12px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {getRiderNumber(entry.riderId) ?? '—'}
                      </td>
                      <td style={{ padding: 'clamp(12px, 2vw, 20px) 12px' }}>
                        {entry.rider
                          ? `${entry.rider.firstName} ${entry.rider.lastName}`
                          : 'Unknown'}
                        {entry.dnf && (
                          <Badge
                            color="red"
                            variant="light"
                            size="sm"
                            ml="sm"
                            style={{ fontSize: '0.6em' }}
                          >
                            DNF
                          </Badge>
                        )}
                      </td>
                      <td
                        style={{
                          padding: 'clamp(12px, 2vw, 20px) 12px',
                          textAlign: 'center',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {entry.trackCount}/{sortedEventTracks.length}
                      </td>
                      <td
                        style={{
                          padding: 'clamp(12px, 2vw, 20px) 12px',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {entry.total > 0 ? (
                          <span className="elapsed">{formatElapsed(entry.total)}</span>
                        ) : (
                          <Text component="span" c="dimmed">
                            --:--
                          </Text>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </main>

        {leaderboardByCategory.length > 1 && (
          <footer
            style={{
              marginTop: 'clamp(24px, 4vw, 48px)',
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {leaderboardByCategory.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCategoryIndex(i)}
                title={`View ${leaderboardByCategory[i].categoryName || 'results'}`}
                style={{
                  width: 12,
                  height: 12,
                  padding: 0,
                  border: 'none',
                  borderRadius: '50%',
                  background: i === categoryIndex ? 'var(--accent)' : 'var(--border)',
                  opacity: i === categoryIndex ? 1 : 0.5,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (i !== categoryIndex) e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  if (i !== categoryIndex) e.currentTarget.style.opacity = '0.5';
                }}
              />
            ))}
          </footer>
        )}
      </div>
    </div>
  );
}
