import { useState, useMemo } from 'react';
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
  const [filterChampId, setFilterChampId] = useState<string>('all');

  // User's org IDs
  const userOrgIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(orgs.filter((o: Organization) => o.ownerUserId === user.id).map(o => o.id));
  }, [user, orgs]);

  // Championships in user's orgs
  const orgChamps = useMemo(() => {
    return championships.filter((c: Championship) => userOrgIds.has(c.orgId));
  }, [championships, userOrgIds]);

  const champMap = useMemo(() => {
    const m = new Map<bigint, Championship>();
    for (const c of orgChamps) m.set(c.id, c);
    return m;
  }, [orgChamps]);

  // Events in user's orgs, optionally filtered by championship
  const filteredEvents = useMemo(() => {
    let evts = events.filter((e: Event) => userOrgIds.has(e.orgId));
    if (filterChampId !== 'all') {
      const cid = BigInt(filterChampId);
      evts = evts.filter((e: Event) => e.championshipId === cid);
    }
    return evts;
  }, [events, userOrgIds, filterChampId]);

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ marginBottom: 0 }}>Calendar</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={filterChampId}
            onChange={(e) => setFilterChampId(e.target.value)}
            className="input"
            style={{ width: 'auto', minWidth: 180 }}
          >
            <option value="all">All Championships</option>
            {orgChamps.map((c: Championship) => (
              <option key={String(c.id)} value={String(c.id)}>
                {'\u25CF'} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Championship legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {orgChamps.map((c: Championship) => (
          <div key={String(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
            <span className="color-dot" style={{ background: c.color }} />
            <span className="muted">{c.name}</span>
          </div>
        ))}
      </div>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button className="ghost small" onClick={prevMonth}>&larr;</button>
        <span style={{ fontWeight: 600, fontSize: '1.1rem', minWidth: 160, textAlign: 'center' }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button className="ghost small" onClick={nextMonth}>&rarr;</button>
        <button className="ghost small" onClick={goToday}>Today</button>
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
                      to={`/event/${evt.id}`}
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
