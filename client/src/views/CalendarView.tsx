import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import { useAuth } from '../auth';
import type { Event, Championship, Organization } from '../module_bindings/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseDate(s: string): Date | null {
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarView() {
  const { user } = useAuth();
  const [events] = useTable(tables.event);
  const [championships] = useTable(tables.championship);
  const [orgs] = useTable(tables.organization);

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedChampIds, setSelectedChampIds] = useState<Set<bigint> | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // User's org IDs
  const userOrgIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(orgs.filter((o: Organization) => o.ownerUserId === user.id).map(o => o.id));
  }, [user, orgs]);

  // Championships in user's orgs
  const orgChamps = useMemo(() => {
    return championships.filter((c: Championship) => userOrgIds.has(c.orgId));
  }, [championships, userOrgIds]);

  // Default: all selected. null means "not yet initialized"
  const activeChampIds = useMemo(() => {
    if (selectedChampIds !== null) return selectedChampIds;
    return new Set(orgChamps.map(c => c.id));
  }, [selectedChampIds, orgChamps]);

  const champMap = useMemo(() => {
    const m = new Map<bigint, Championship>();
    for (const c of orgChamps) m.set(c.id, c);
    return m;
  }, [orgChamps]);

  const toggleChamp = (id: bigint) => {
    setSelectedChampIds(prev => {
      const current = prev ?? new Set(orgChamps.map(c => c.id));
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedChampIds(null);
  const selectNone = () => setSelectedChampIds(new Set());

  const allSelected = activeChampIds.size === orgChamps.length;
  const noneSelected = activeChampIds.size === 0;

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Events in user's orgs, filtered by selected championships
  const filteredEvents = useMemo(() => {
    let evts = events.filter((e: Event) => userOrgIds.has(e.orgId));
    if (!allSelected) {
      evts = evts.filter((e: Event) => activeChampIds.has(e.championshipId));
    }
    return evts;
  }, [events, userOrgIds, activeChampIds, allSelected]);

  // Map date keys to events (expand multi-day events)
  const dateEvents = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const evt of filteredEvents) {
      const start = parseDate(evt.startDate);
      const end = parseDate(evt.endDate);
      if (!start) continue;
      const last = end ?? start;
      const d = new Date(start);
      while (d <= last) {
        const key = dateKey(d);
        const arr = m.get(key) ?? [];
        arr.push(evt);
        m.set(key, arr);
        d.setDate(d.getDate() + 1);
      }
    }
    return m;
  }, [filteredEvents]);

  // Calendar grid
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const goToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  };

  const today = dateKey(new Date());

  // Last (most recent past) and next (upcoming) event for jump buttons
  const { lastEvent, nextEvent } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let last: Event | null = null;
    let next: Event | null = null;
    for (const evt of filteredEvents) {
      const start = parseDate(evt.startDate);
      const end = parseDate(evt.endDate);
      if (!start) continue;
      const endDate = end ?? start;
      if (endDate < todayStart) {
        if (!last || (parseDate(last.endDate) ?? parseDate(last.startDate)!) < endDate) {
          last = evt;
        }
      } else if (start >= todayStart) {
        if (!next || parseDate(next.startDate)! > start) {
          next = evt;
        }
      }
    }
    return { lastEvent: last, nextEvent: next };
  }, [filteredEvents]);

  const goToLastEvent = () => {
    if (!lastEvent) return;
    const d = parseDate(lastEvent.startDate);
    if (d) {
      setYear(d.getFullYear());
      setMonth(d.getMonth());
    }
  };

  const goToNextEvent = () => {
    if (!nextEvent) return;
    const d = parseDate(nextEvent.startDate);
    if (d) {
      setYear(d.getFullYear());
      setMonth(d.getMonth());
    }
  };

  // Dropdown label
  const dropdownLabel = allSelected
    ? 'All Championships'
    : noneSelected
      ? 'No Championships'
      : activeChampIds.size === 1
        ? champMap.get([...activeChampIds][0])?.name ?? '1 selected'
        : `${activeChampIds.size} Championships`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ marginBottom: 0 }}>Calendar</h1>

        {/* Multi-select championship dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            className="input"
            onClick={() => setDropdownOpen(o => !o)}
            style={{ width: 'auto', minWidth: 200, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {!allSelected && !noneSelected && (
                <span style={{ display: 'flex', gap: 2 }}>
                  {[...activeChampIds].slice(0, 4).map(id => {
                    const c = champMap.get(id);
                    return c ? <span key={String(id)} className="color-dot" style={{ background: c.color }} /> : null;
                  })}
                </span>
              )}
              {dropdownLabel}
            </span>
            <span style={{ fontSize: '0.6rem' }}>{dropdownOpen ? '\u25B2' : '\u25BC'}</span>
          </button>

          {dropdownOpen && (
            <div className="champ-dropdown">
              <div className="champ-dropdown-actions">
                <button className="ghost small" onClick={selectAll} disabled={allSelected}>All</button>
                <button className="ghost small" onClick={selectNone} disabled={noneSelected}>None</button>
              </div>
              {orgChamps.map((c: Championship) => {
                const checked = activeChampIds.has(c.id);
                return (
                  <label key={String(c.id)} className="champ-dropdown-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChamp(c.id)}
                    />
                    <span className="color-dot" style={{ background: c.color }} />
                    <span>{c.name}</span>
                  </label>
                );
              })}
              {orgChamps.length === 0 && (
                <div className="champ-dropdown-empty">No championships</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button className="ghost small" onClick={prevMonth}>&larr;</button>
        <span style={{ fontWeight: 600, fontSize: '1.1rem', minWidth: 160, textAlign: 'center' }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button className="ghost small" onClick={nextMonth}>&rarr;</button>
        <button className="ghost small" onClick={goToday}>Today</button>
        <button className="ghost small" onClick={goToLastEvent} disabled={!lastEvent} title={lastEvent?.name}>Last event</button>
        <button className="ghost small" onClick={goToNextEvent} disabled={!nextEvent} title={nextEvent?.name}>Next event</button>
      </div>

      {/* Calendar grid */}
      <div className="cal-grid">
        {DAYS.map(d => (
          <div key={d} className="cal-header">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="cal-cell empty" />;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const evts = dateEvents.get(key) ?? [];
          const isToday = key === today;
          return (
            <div key={key} className={`cal-cell${isToday ? ' today' : ''}`}>
              <div className="cal-day">{day}</div>
              <div className="cal-events">
                {evts.slice(0, 3).map((evt) => {
                  const champ = champMap.get(evt.championshipId);
                  return (
                    <Link
                      key={String(evt.id)}
                      to={`/event/${evt.slug}`}
                      className="cal-event"
                      style={{ borderLeftColor: champ?.color ?? 'var(--accent)' }}
                      title={evt.name}
                    >
                      {evt.name}
                    </Link>
                  );
                })}
                {evts.length > 3 && (
                  <span className="cal-more">+{evts.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
