import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrgMaybe } from '../OrgContext';
import AddRiderModal from '../components/AddRiderModal';
import AddTrackModal from '../components/AddTrackModal';
import CheckInModal from '../components/CheckInModal';
import SearchableSelect from '../components/SearchableSelect';
import { faPen, faTrash } from '../icons';
import { RowActionMenu } from '../components/ActionMenu';
import type {
  Event,
  EventCategory,
  Rider,
  EventRider,
  Venue,
  EventTrack,
  TrackVariation,
  Track,
  Run,
  CategoryTrack,
  EventTrackSchedule,
  User,
  OrgMember,
  TimekeeperAssignment,
} from '../module_bindings/types';
import { getErrorMessage } from '../utils';

export default function EventManageView() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const activeOrgId = useActiveOrgMaybe();
  const { isAuthenticated, isReady, canOrganizeEvent } = useAuth();

  const [events] = useTable(tables.event);
  const [venues] = useTable(tables.venue);
  const [eventTracks] = useTable(tables.event_track);
  const [trackVariations] = useTable(tables.track_variation);
  const [tracksData] = useTable(tables.track);
  const [runs] = useTable(tables.run);
  const [trackSchedules] = useTable(tables.event_track_schedule);
  const [allCategories] = useTable(tables.event_category);
  const [categoryTracks] = useTable(tables.category_track);
  const [allRiders] = useTable(tables.rider);
  const [eventRiders] = useTable(tables.event_rider);
  const [timekeeperAssignments] = useTable(tables.timekeeper_assignment);
  const [users] = useTable(tables.user);
  const [orgMembers] = useTable(tables.org_member);

  const createCategory = useReducer(reducers.createEventCategory);
  const addTrackToCategory = useReducer(reducers.addTrackToCategory);
  const removeTrackFromCategory = useReducer(reducers.removeTrackFromCategory);
  const addTrackToEvent = useReducer(reducers.addTrackToEvent);
  const removeTrackFromEvent = useReducer(reducers.removeTrackFromEvent);
  const updateCategory = useReducer(reducers.updateEventCategory);
  const deleteCategory = useReducer(reducers.deleteEventCategory);
  const importCategories = useReducer(reducers.importCategoriesFromEvent);
  const addRiderToEvent = useReducer(reducers.addRiderToEvent);
  const importRiders = useReducer(reducers.importRidersFromEvent);
  const updateEventRider = useReducer(reducers.updateEventRider);
  const generateTrackSchedule = useReducer(reducers.generateTrackSchedule);
  const clearTrackSchedule = useReducer(reducers.clearTrackSchedule);
  const setTrackTimekeepers = useReducer(reducers.setTrackTimekeepers);

  const event = useMemo(() => {
    if (!eventSlug) return undefined;
    if (activeOrgId) {
      const inOrg = events.find((e: Event) => e.slug === eventSlug && e.orgId === activeOrgId);
      if (inOrg) return inOrg;
    }
    return events.find((e: Event) => e.slug === eventSlug);
  }, [eventSlug, activeOrgId, events]);
  const eid = event?.id ?? 0n;
  const venue = event ? venues.find((v: Venue) => v.id === event.venueId) : undefined;
  const canEdit = event ? canOrganizeEvent(eid, event.orgId) : false;

  const sortedEventTracks = useMemo(() => {
    return [...eventTracks]
      .filter((et: EventTrack) => et.eventId === eid)
      .sort((a: EventTrack, b: EventTrack) => a.sortOrder - b.sortOrder);
  }, [eventTracks, eid]);

  const tvMap = useMemo(() => {
    const m = new Map<bigint, TrackVariation>();
    for (const tv of trackVariations) m.set(tv.id, tv);
    return m;
  }, [trackVariations]);

  const trackMap = useMemo(() => {
    const m = new Map<bigint, Track>();
    for (const t of tracksData) m.set(t.id, t);
    return m;
  }, [tracksData]);

  const venueTracks = useMemo(() => {
    if (!venue) return [];
    return tracksData.filter((t: Track) => t.venueId === venue.id);
  }, [venue, tracksData]);

  const usedVariationIds = useMemo(() => {
    return new Set(sortedEventTracks.map((et: EventTrack) => et.trackVariationId));
  }, [sortedEventTracks]);

  const categories = useMemo(() => {
    return allCategories
      .filter((c: EventCategory) => c.eventId === eid)
      .sort((a: EventCategory, b: EventCategory) => a.numberRangeStart - b.numberRangeStart);
  }, [allCategories, eid]);

  // Category → list of event track IDs (for display)
  const categoryTracksByCategoryId = useMemo(() => {
    const m = new Map<bigint, CategoryTrack[]>();
    for (const ct of categoryTracks) {
      const list = m.get(ct.categoryId) ?? [];
      list.push(ct);
      m.set(ct.categoryId, list);
    }
    return m;
  }, [categoryTracks]);

  // Other events in the same org (for import)
  const otherEvents = useMemo(() => {
    if (!event) return [];
    return events
      .filter((e: Event) => e.orgId === event.orgId && e.id !== eid)
      .sort((a: Event, b: Event) => a.name.localeCompare(b.name));
  }, [events, event, eid]);

  // Categories from other events (for import preview)
  const categoriesByEvent = useMemo(() => {
    const m = new Map<bigint, EventCategory[]>();
    for (const e of otherEvents) {
      const cats = allCategories.filter((c: EventCategory) => c.eventId === e.id);
      if (cats.length > 0) m.set(e.id, cats);
    }
    return m;
  }, [otherEvents, allCategories]);

  const eventRiderIds = useMemo(() => {
    return new Set(
      eventRiders.filter((er: EventRider) => er.eventId === eid).map((er: EventRider) => er.riderId)
    );
  }, [eventRiders, eid]);

  const orgRiders = useMemo(() => {
    if (!event) return [];
    return allRiders
      .filter((r: Rider) => r.orgId === event.orgId)
      .sort((a: Rider, b: Rider) =>
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
      );
  }, [allRiders, event]);

  // Rider counts per other event (for import preview)
  const riderCountByEvent = useMemo(() => {
    const m = new Map<bigint, number>();
    for (const e of otherEvents) {
      const count = eventRiders.filter((er: EventRider) => er.eventId === e.id).length;
      if (count > 0) m.set(e.id, count);
    }
    return m;
  }, [otherEvents, eventRiders]);

  // Map riderId → EventRider for this event
  const eventRiderMap = useMemo(() => {
    const m = new Map<bigint, EventRider>();
    for (const er of eventRiders) {
      if (er.eventId === eid) m.set(er.riderId, er);
    }
    return m;
  }, [eventRiders, eid]);

  // Category map for display
  const categoryMap = useMemo(() => {
    const m = new Map<bigint, EventCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  // Schedule config per event track
  const scheduleByEventTrackId = useMemo(() => {
    const m = new Map<bigint, EventTrackSchedule>();
    for (const s of trackSchedules) m.set(s.eventTrackId, s);
    return m;
  }, [trackSchedules]);

  // Assigned number per rider: use er.assignedNumber if set (non-zero), else computed from category
  const assignedNumberByRiderId = useMemo(() => {
    const m = new Map<bigint, number | null>();
    const ridersInEvent = eventRiders.filter((er: EventRider) => er.eventId === eid);
    // Compute default from category
    const computed = new Map<bigint, number | null>();
    for (const cat of categories) {
      const inCat = ridersInEvent
        .filter((er: EventRider) => er.categoryId === cat.id)
        .sort((a: EventRider, b: EventRider) =>
          a.riderId < b.riderId ? -1 : a.riderId > b.riderId ? 1 : 0
        );
      inCat.forEach((er: EventRider, idx: number) => {
        computed.set(er.riderId, cat.numberRangeStart + idx);
      });
    }
    for (const er of ridersInEvent) {
      const num = er.assignedNumber !== 0 ? er.assignedNumber : (computed.get(er.riderId) ?? null);
      m.set(er.riderId, num);
    }
    return m;
  }, [eventRiders, eid, categories]);

  // Category form state
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState<bigint | null>(null);
  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
    rangeStart: '',
    rangeEnd: '',
  });
  const [catError, setCatError] = useState('');
  const [categoryTrackError, setCategoryTrackError] = useState('');

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importError, setImportError] = useState('');

  // Rider state
  const [showAddRiderModal, setShowAddRiderModal] = useState(false);
  const [showImportRiders, setShowImportRiders] = useState(false);
  const [riderError, setRiderError] = useState('');
  const [importRiderError, setImportRiderError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all'); // 'all' | 'none' | category id as string
  const [checkInModal, setCheckInModal] = useState<{ rider: Rider; eventRider: EventRider } | null>(
    null
  );
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
  const [riderPage, setRiderPage] = useState(0);
  const [riderPageSize, setRiderPageSize] = useState(() => {
    try {
      const stored = localStorage.getItem('racetimetracker-event-riders-page-size');
      if (stored) {
        const n = parseInt(stored, 10);
        if ([10, 20, 50, 100].includes(n)) return n;
      }
    } catch {}
    return 10;
  });
  useEffect(() => {
    setRiderPage(0);
  }, [categoryFilter, riderPageSize]);

  // Filtered riders for event (by category filter) — used for pagination
  const filteredRiders = useMemo(() => {
    const assigned = orgRiders.filter((r) => eventRiderIds.has(r.id));
    return assigned.filter((r) => {
      const er = eventRiderMap.get(r.id);
      if (!er) return false;
      if (categoryFilter === 'all') return true;
      if (categoryFilter === 'none') return er.categoryId === 0n;
      return er.categoryId === BigInt(categoryFilter);
    });
  }, [orgRiders, eventRiderIds, eventRiderMap, categoryFilter]);

  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [addTrackError, setAddTrackError] = useState('');

  // Timekeeper assignment state
  const [tkAssignError, setTkAssignError] = useState('');

  const assignableUsers = useMemo(() => {
    if (!event) return [];
    const memberIds = new Set<bigint>();
    for (const m of orgMembers) {
      if ((m as OrgMember).orgId === event.orgId) memberIds.add((m as OrgMember).userId);
    }
    return users
      .filter((u: User) => memberIds.has(u.id) && !u.googleSub?.startsWith('pending:'))
      .sort((a: User, b: User) => (a.name || a.email).localeCompare(b.name || b.email)) as User[];
  }, [event, orgMembers, users]);
  const [activeTab, setActiveTab] = useState<'tracks' | 'categories' | 'racers' | 'runs'>('tracks');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleFormByTrack, setScheduleFormByTrack] = useState<
    Record<
      string,
      { startDateTime: string; intervalValue: string; intervalUnit: 'minutes' | 'seconds' }
    >
  >({});

  const resetCatForm = () => {
    setCatForm({ name: '', description: '', rangeStart: '', rangeEnd: '' });
    setEditingCatId(null);
    setShowCatForm(false);
    setCatError('');
  };

  const startEditCat = (cat: EventCategory) => {
    setCatForm({
      name: cat.name,
      description: cat.description,
      rangeStart: String(cat.numberRangeStart),
      rangeEnd: String(cat.numberRangeEnd),
    });
    setEditingCatId(cat.id);
    setShowCatForm(true);
    setCatError('');
  };

  const checkOverlap = (
    rangeStart: number,
    rangeEnd: number,
    excludeId: bigint | null
  ): string | null => {
    for (const cat of categories) {
      if (excludeId !== null && cat.id === excludeId) continue;
      if (rangeStart <= cat.numberRangeEnd && rangeEnd >= cat.numberRangeStart) {
        return `Range ${rangeStart}–${rangeEnd} overlaps with "${cat.name}" (${cat.numberRangeStart}–${cat.numberRangeEnd})`;
      }
    }
    return null;
  };

  const handleCatSubmit = async () => {
    setCatError('');
    if (!catForm.name.trim()) {
      setCatError('Name is required');
      return;
    }
    if (catForm.rangeStart.trim() === '' || catForm.rangeEnd.trim() === '') {
      setCatError('Number range is required');
      return;
    }
    const rangeStart = parseInt(catForm.rangeStart, 10);
    const rangeEnd = parseInt(catForm.rangeEnd, 10);
    if (isNaN(rangeStart) || isNaN(rangeEnd)) {
      setCatError('Number range must be valid numbers');
      return;
    }
    if (rangeStart > rangeEnd) {
      setCatError('Range start must be <= range end');
      return;
    }
    const overlap = checkOverlap(rangeStart, rangeEnd, editingCatId);
    if (overlap) {
      setCatError(overlap);
      return;
    }
    try {
      if (editingCatId !== null) {
        await updateCategory({
          categoryId: editingCatId,
          name: catForm.name.trim(),
          description: catForm.description.trim(),
          numberRangeStart: rangeStart,
          numberRangeEnd: rangeEnd,
        });
      } else {
        await createCategory({
          eventId: eid,
          name: catForm.name.trim(),
          description: catForm.description.trim(),
          numberRangeStart: rangeStart,
          numberRangeEnd: rangeEnd,
        });
      }
      resetCatForm();
    } catch (e: unknown) {
      setCatError(getErrorMessage(e, 'Failed'));
    }
  };

  const handleDeleteCat = async (cat: EventCategory) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await deleteCategory({ categoryId: cat.id });
    } catch (e: unknown) {
      setCatError(getErrorMessage(e, 'Failed'));
    }
  };

  const handleAddTrackToCategory = async (categoryId: bigint, eventTrackId: bigint) => {
    setCategoryTrackError('');
    try {
      await addTrackToCategory({ categoryId, eventTrackId });
    } catch (e: unknown) {
      setCategoryTrackError(getErrorMessage(e, 'Failed'));
    }
  };

  const handleRemoveTrackFromCategory = async (categoryTrackId: bigint) => {
    setCategoryTrackError('');
    try {
      await removeTrackFromCategory({ categoryTrackId });
    } catch (e: unknown) {
      setCategoryTrackError(getErrorMessage(e, 'Failed'));
    }
  };

  const handleImport = async (sourceEventId: bigint) => {
    setImportError('');
    try {
      await importCategories({ targetEventId: eid, sourceEventId });
      setShowImport(false);
    } catch (e: unknown) {
      setImportError(getErrorMessage(e, 'Failed'));
    }
  };

  const handleAddRider = async (riderId: bigint) => {
    setRiderError('');
    try {
      await addRiderToEvent({ eventId: eid, riderId });
    } catch (e: unknown) {
      setRiderError(getErrorMessage(e, 'Failed'));
    }
  };

  const handleImportRiders = async (sourceEventId: bigint) => {
    setImportRiderError('');
    try {
      await importRiders({ targetEventId: eid, sourceEventId });
      setShowImportRiders(false);
    } catch (e: unknown) {
      setImportRiderError(getErrorMessage(e, 'Failed'));
    }
  };

  const handleToggleCheckIn = async (er: EventRider) => {
    setRiderError('');
    try {
      await updateEventRider({
        eventRiderId: er.id,
        categoryId: er.categoryId,
        checkedIn: !er.checkedIn,
        assignedNumber: er.assignedNumber,
      });
    } catch (e: unknown) {
      setRiderError(getErrorMessage(e, 'Failed'));
    }
  };

  const handleRevertCheckIn = async (er: EventRider, rider: Rider) => {
    if (!confirm(`Revert check-in for ${rider.firstName} ${rider.lastName}?`)) return;
    await handleToggleCheckIn(er);
  };

  const handleCheckIn = async (er: EventRider, assignedNumber: number) => {
    setRiderError('');
    try {
      await updateEventRider({
        eventRiderId: er.id,
        categoryId: er.categoryId,
        checkedIn: true,
        assignedNumber,
      });
    } catch (e: unknown) {
      setRiderError(getErrorMessage(e, 'Failed'));
    }
  };

  const handleChangeCategory = async (er: EventRider, newCategoryId: bigint) => {
    setRiderError('');
    try {
      await updateEventRider({
        eventRiderId: er.id,
        categoryId: newCategoryId,
        checkedIn: er.checkedIn,
        assignedNumber: er.assignedNumber,
      });
    } catch (e: unknown) {
      setRiderError(getErrorMessage(e, 'Failed'));
    }
  };

  const handleAddTrack = async (tvId: bigint) => {
    setAddTrackError('');
    try {
      const nextOrder =
        sortedEventTracks.length > 0
          ? Math.max(...sortedEventTracks.map((et: EventTrack) => et.sortOrder)) + 1
          : 1;
      await addTrackToEvent({ eventId: eid, trackVariationId: tvId, sortOrder: nextOrder });
      setShowAddTrackModal(false);
    } catch (e: unknown) {
      setAddTrackError(getErrorMessage(e, 'Failed'));
    }
  };

  const handleRemoveTrack = async (et: EventTrack) => {
    const tv = tvMap.get(et.trackVariationId);
    const track = tv ? trackMap.get(tv.trackId) : undefined;
    const label = track ? `${track.name} — ${tv?.name}` : 'this track';
    if (!confirm(`Remove "${label}" from this event? Associated runs will be deleted.`)) return;
    try {
      await removeTrackFromEvent({ eventTrackId: et.id });
    } catch (e: unknown) {
      setAddTrackError(getErrorMessage(e, 'Failed'));
    }
  };

  const getScheduleForm = (etId: bigint) => {
    const key = String(etId);
    const existing = scheduleFormByTrack[key];
    const schedule = scheduleByEventTrackId.get(etId);
    if (existing) return existing;
    if (schedule && event) {
      const d = new Date(Number(schedule.startTime));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const intervalSec = schedule.intervalSeconds;
      const intervalUnit = intervalSec >= 60 && intervalSec % 60 === 0 ? 'minutes' : 'seconds';
      const intervalValue =
        intervalUnit === 'minutes' ? String(intervalSec / 60) : String(intervalSec);
      return { startDateTime: `${y}-${m}-${day}T${h}:${min}`, intervalValue, intervalUnit };
    }
    if (event) {
      const start = event.startDate + 'T09:00';
      return { startDateTime: start, intervalValue: '3', intervalUnit: 'minutes' as const };
    }
    return { startDateTime: '', intervalValue: '3', intervalUnit: 'minutes' as const };
  };

  const setScheduleForm = (
    etId: bigint,
    updates: Partial<{
      startDateTime: string;
      intervalValue: string;
      intervalUnit: 'minutes' | 'seconds';
    }>
  ) => {
    const key = String(etId);
    const base = getScheduleForm(etId);
    const merged = { ...base, ...updates };
    const valid: {
      startDateTime: string;
      intervalValue: string;
      intervalUnit: 'minutes' | 'seconds';
    } = {
      startDateTime: merged.startDateTime,
      intervalValue: merged.intervalValue,
      intervalUnit: merged.intervalUnit === 'seconds' ? 'seconds' : 'minutes',
    };
    setScheduleFormByTrack((prev) => ({ ...prev, [key]: valid }));
  };

  const handleGenerateSchedule = async (et: EventTrack) => {
    if (!event) return;
    setScheduleError('');
    const form = getScheduleForm(et.id);
    const startMs = new Date(form.startDateTime).getTime();
    if (isNaN(startMs)) {
      setScheduleError('Please enter a valid start date and time.');
      return;
    }
    const intervalNum = parseInt(form.intervalValue, 10);
    if (isNaN(intervalNum) || intervalNum < 1) {
      setScheduleError('Interval must be at least 1.');
      return;
    }
    const intervalSeconds = form.intervalUnit === 'minutes' ? intervalNum * 60 : intervalNum;
    try {
      await generateTrackSchedule({
        eventTrackId: et.id,
        startTime: BigInt(startMs),
        intervalSeconds,
      });
    } catch (e: unknown) {
      setScheduleError(getErrorMessage(e, 'Failed'));
    }
  };

  const handleClearSchedule = async (et: EventTrack) => {
    const tv = tvMap.get(et.trackVariationId);
    const track = tv ? trackMap.get(tv.trackId) : undefined;
    const label = track ? `${track.name} — ${tv?.name}` : 'this track';
    if (!confirm(`Clear schedule and all queued runs for "${label}"?`)) return;
    setScheduleError('');
    try {
      await clearTrackSchedule({ eventTrackId: et.id });
    } catch (e: unknown) {
      setScheduleError(getErrorMessage(e, 'Failed'));
    }
  };

  if (!isReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!event) {
    if (events.length === 0) return null;
    return <div className="empty">Event not found.</div>;
  }
  if (!canEdit) return <div className="empty">Access denied.</div>;

  const assignedRiders = orgRiders.filter((r) => eventRiderIds.has(r.id));
  const unassignedRiders = orgRiders.filter((r) => !eventRiderIds.has(r.id));
  const riderTotalPages = Math.max(1, Math.ceil(filteredRiders.length / riderPageSize));
  const paginatedRiders = filteredRiders.slice(
    riderPage * riderPageSize,
    (riderPage + 1) * riderPageSize
  );

  return (
    <div>
      <Link to={`/event/${event.slug}`} className="back-link">
        &larr; Back to Event
      </Link>
      <h1 style={{ marginBottom: 4 }}>Manage: {event.name}</h1>
      <p className="muted small-text" style={{ marginBottom: 12 }}>
        {event.description}
      </p>

      <div className="tabs">
        <button
          className={activeTab === 'tracks' ? 'active' : ''}
          onClick={() => setActiveTab('tracks')}
        >
          Tracks ({sortedEventTracks.length})
        </button>
        <button
          className={activeTab === 'categories' ? 'active' : ''}
          onClick={() => setActiveTab('categories')}
        >
          Categories ({categories.length})
        </button>
        <button
          className={activeTab === 'racers' ? 'active' : ''}
          onClick={() => setActiveTab('racers')}
        >
          Riders ({assignedRiders.length})
        </button>
        <button
          className={activeTab === 'runs' ? 'active' : ''}
          onClick={() => setActiveTab('runs')}
        >
          Runs
        </button>
      </div>

      {activeTab === 'tracks' && (
        <div className="section">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <div className="section-title" style={{ marginBottom: 0 }}>
              Tracks{' '}
              <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 400 }}>
                ({sortedEventTracks.length})
              </span>
            </div>
            <button
              className="primary small"
              onClick={() => {
                setShowAddTrackModal(true);
                setAddTrackError('');
              }}
            >
              + Add Track
            </button>
          </div>

          {addTrackError && (
            <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>
              {addTrackError}
            </div>
          )}

          {sortedEventTracks.length === 0 ? (
            <div className="empty">No tracks assigned to this event.</div>
          ) : (
            sortedEventTracks.map((et: EventTrack) => {
              const tv = tvMap.get(et.trackVariationId);
              const track = tv ? trackMap.get(tv.trackId) : undefined;
              const trackRuns = runs.filter((r: Run) => r.eventTrackId === et.id);
              const runningCount = trackRuns.filter((r: Run) => r.status === 'running').length;
              const finishedCount = trackRuns.filter((r: Run) => r.status === 'finished').length;
              const queuedCount = trackRuns.filter((r: Run) => r.status === 'queued').length;

              return (
                <div
                  key={String(et.id)}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Link
                    to={`/event/${event.slug}/track/${et.id}`}
                    style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}
                  >
                    <div className="track-card">
                      <div>
                        <h3>
                          {track?.name ?? 'Unknown Track'}
                          {tv ? ` — ${tv.name}` : ''}
                        </h3>
                        {tv && <p className="muted small-text">{tv.description}</p>}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                        {runningCount > 0 && (
                          <span className="badge running" style={{ marginRight: 4 }}>
                            {runningCount} racing
                          </span>
                        )}
                        {queuedCount > 0 && (
                          <span className="badge queued" style={{ marginRight: 4 }}>
                            {queuedCount} queued
                          </span>
                        )}
                        <span className="badge finished">{finishedCount} done</span>
                      </div>
                    </div>
                  </Link>
                  <button
                    className="ghost small"
                    onClick={() => handleRemoveTrack(et)}
                    title="Remove"
                    style={{ color: 'var(--red)', flexShrink: 0 }}
                  >
                    &times;
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="section">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <div className="section-title" style={{ marginBottom: 0 }}>
              Categories{' '}
              <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 400 }}>
                ({categories.length})
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!showCatForm && (
                <>
                  <button
                    className="ghost small"
                    onClick={() => {
                      setShowImport(!showImport);
                      setImportError('');
                    }}
                  >
                    {showImport ? 'Cancel Import' : 'Import'}
                  </button>
                  <button
                    className="primary small"
                    onClick={() => {
                      setShowCatForm(true);
                      setEditingCatId(null);
                      setCatForm({ name: '', description: '', rangeStart: '', rangeEnd: '' });
                      setCatError('');
                    }}
                  >
                    + Add Category
                  </button>
                </>
              )}
            </div>
          </div>

          {catError && (
            <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>
              {catError}
            </div>
          )}
          {categoryTrackError && (
            <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>
              {categoryTrackError}
            </div>
          )}

          {/* Import from another event */}
          {showImport && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 8, fontSize: '0.85rem' }}>
                Import categories from another event
              </div>
              {importError && (
                <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>
                  {importError}
                </div>
              )}
              {otherEvents.length === 0 ? (
                <div className="muted small-text">No other events in this organization.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {otherEvents
                    .filter((e) => categoriesByEvent.has(e.id))
                    .map((evt: Event) => {
                      const cats = categoriesByEvent.get(evt.id) ?? [];
                      return (
                        <div
                          key={String(evt.id)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius)',
                            background: 'var(--bg)',
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '0.85rem' }}>{evt.name}</strong>
                            <span className="muted small-text" style={{ marginLeft: 8 }}>
                              {cats.length} categor{cats.length === 1 ? 'y' : 'ies'}:{' '}
                              {cats.map((c) => c.name).join(', ')}
                            </span>
                          </div>
                          <button className="primary small" onClick={() => handleImport(evt.id)}>
                            Import
                          </button>
                        </div>
                      );
                    })}
                  {otherEvents.every((e) => !categoriesByEvent.has(e.id)) && (
                    <div className="muted small-text">No other events have categories defined.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Category form */}
          {showCatForm && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 8 }}>
                {editingCatId ? 'Edit Category' : 'New Category'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label className="input-label">Name *</label>
                  <input
                    type="text"
                    value={catForm.name}
                    onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                    className="input"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="input-label">Description</label>
                  <input
                    type="text"
                    value={catForm.description}
                    onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))}
                    className="input"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label className="input-label">Number Range Start *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={catForm.rangeStart}
                      onChange={(e) => setCatForm((f) => ({ ...f, rangeStart: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="input-label">Number Range End *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={catForm.rangeEnd}
                      onChange={(e) => setCatForm((f) => ({ ...f, rangeEnd: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="primary small" onClick={handleCatSubmit}>
                    {editingCatId ? 'Save' : 'Create'}
                  </button>
                  <button className="ghost small" onClick={resetCatForm}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Category list */}
          {categories.length === 0 && !showCatForm ? (
            <div className="empty">
              No categories defined. Add one or import from another event.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Number Range</th>
                  <th>Tracks</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat: EventCategory) => {
                  const cts = categoryTracksByCategoryId.get(cat.id) ?? [];
                  const eventTrackIdsInCat = new Set(
                    cts.map((ct: CategoryTrack) => ct.eventTrackId)
                  );
                  const availableTracks = sortedEventTracks.filter(
                    (et: EventTrack) => !eventTrackIdsInCat.has(et.id)
                  );
                  return (
                    <tr key={String(cat.id)}>
                      <td>
                        <strong>{cat.name}</strong>
                      </td>
                      <td className="muted small-text">{cat.description || '—'}</td>
                      <td className="muted small-text">
                        {cat.numberRangeStart} – {cat.numberRangeEnd}
                      </td>
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 4,
                            alignItems: 'center',
                          }}
                        >
                          {cts.map((ct: CategoryTrack) => {
                            const et = sortedEventTracks.find(
                              (e: EventTrack) => e.id === ct.eventTrackId
                            );
                            const tv = et ? tvMap.get(et.trackVariationId) : undefined;
                            const track = tv ? trackMap.get(tv.trackId) : undefined;
                            const label = track
                              ? `${track.name}${tv ? ` — ${tv.name}` : ''}`
                              : 'Track';
                            const trackColor = track?.color ?? '#6b7280';
                            const bgColor = trackColor.startsWith('#')
                              ? `${trackColor}20`
                              : trackColor;
                            return (
                              <span
                                key={String(ct.id)}
                                className="badge"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  background: bgColor,
                                  color: trackColor,
                                }}
                              >
                                <Link
                                  to={`/event/${event.slug}/track/${ct.eventTrackId}`}
                                  style={{
                                    color: 'inherit',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <span className="color-dot" style={{ background: trackColor }} />
                                  {label}
                                </Link>
                                <button
                                  type="button"
                                  className="ghost small"
                                  onClick={() => handleRemoveTrackFromCategory(ct.id)}
                                  title="Remove"
                                  style={{
                                    padding: 0,
                                    margin: 0,
                                    lineHeight: 1,
                                    color: 'var(--red)',
                                    fontSize: '0.9em',
                                  }}
                                >
                                  &times;
                                </button>
                              </span>
                            );
                          })}
                          {availableTracks.length > 0 && (
                            <select
                              className="input"
                              value=""
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  handleAddTrackToCategory(cat.id, BigInt(val));
                                  e.target.value = '';
                                }
                              }}
                              style={{
                                width: 'auto',
                                minWidth: 140,
                                padding: '4px 8px',
                                fontSize: '0.8rem',
                              }}
                            >
                              <option value="">+ Add track</option>
                              {availableTracks.map((et: EventTrack) => {
                                const tv = tvMap.get(et.trackVariationId);
                                const track = tv ? trackMap.get(tv.trackId) : undefined;
                                const label = track
                                  ? `${track.name}${tv ? ` — ${tv.name}` : ''}`
                                  : 'Track';
                                return (
                                  <option key={String(et.id)} value={String(et.id)}>
                                    {label}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                          {cts.length === 0 && availableTracks.length === 0 && (
                            <span className="muted small-text">No tracks in event</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <RowActionMenu
                          items={[
                            { icon: faPen, label: 'Edit', onClick: () => startEditCat(cat) },
                            {
                              icon: faTrash,
                              label: 'Delete',
                              danger: true,
                              onClick: () => handleDeleteCat(cat),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'racers' && (
        <div className="section">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <div className="section-title" style={{ marginBottom: 0 }}>
              Riders{' '}
              <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 400 }}>
                ({assignedRiders.length})
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="ghost small"
                onClick={() => {
                  setShowImportRiders(!showImportRiders);
                  setImportRiderError('');
                }}
              >
                {showImportRiders ? 'Cancel Import' : 'Import'}
              </button>
              <button className="primary small" onClick={() => setShowAddRiderModal(true)}>
                + Add Riders
              </button>
            </div>
          </div>

          {riderError && (
            <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>
              {riderError}
            </div>
          )}

          {/* Import racers from another event */}
          {showImportRiders && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 8, fontSize: '0.85rem' }}>
                Import riders from another event
              </div>
              {importRiderError && (
                <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>
                  {importRiderError}
                </div>
              )}
              {otherEvents.length === 0 ? (
                <div className="muted small-text">No other events in this organization.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {otherEvents
                    .filter((e) => riderCountByEvent.has(e.id))
                    .map((evt: Event) => {
                      const count = riderCountByEvent.get(evt.id) ?? 0;
                      return (
                        <div
                          key={String(evt.id)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius)',
                            background: 'var(--bg)',
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '0.85rem' }}>{evt.name}</strong>
                            <span className="muted small-text" style={{ marginLeft: 8 }}>
                              {count} rider{count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <button
                            className="primary small"
                            onClick={() => handleImportRiders(evt.id)}
                          >
                            Import
                          </button>
                        </div>
                      );
                    })}
                  {otherEvents.every((e) => !riderCountByEvent.has(e.id)) && (
                    <div className="muted small-text">No other events have riders assigned.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Category filter */}
          {assignedRiders.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <select
                className="input"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: 'auto', minWidth: 180 }}
              >
                <option value="all">All Categories</option>
                <option value="none">No Category</option>
                {categories.map((cat) => (
                  <option key={String(cat.id)} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {assignedRiders.length === 0 ? (
            <div className="empty">No riders assigned to this event.</div>
          ) : filteredRiders.length === 0 ? (
            <div className="empty">No riders match this filter.</div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>No.</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Email</th>
                    <th style={{ width: 120, minWidth: 120, textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRiders.map((r: Rider) => {
                    const er = eventRiderMap.get(r.id);
                    if (!er) return null;
                    const num = assignedNumberByRiderId.get(r.id);
                    return (
                      <tr key={String(r.id)}>
                        <td className="muted small-text">
                          {num !== null && num !== undefined ? num : '—'}
                        </td>
                        <td>
                          {r.firstName} {r.lastName}
                        </td>
                        <td>
                          <select
                            className="input"
                            value={String(er.categoryId)}
                            onChange={(e) => handleChangeCategory(er, BigInt(e.target.value))}
                            style={{
                              width: 'auto',
                              minWidth: 120,
                              padding: '2px 6px',
                              fontSize: '0.8rem',
                            }}
                          >
                            <option value="0">—</option>
                            {categories.map((cat) => (
                              <option key={String(cat.id)} value={String(cat.id)}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="muted small-text">{r.email || '—'}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {er.checkedIn ? (
                            <span className="badge checked-in">
                              Checked in
                              <button
                                type="button"
                                className="badge-revert"
                                onClick={() => handleRevertCheckIn(er, r)}
                                title="Revert check-in"
                              >
                                &times;
                              </button>
                            </span>
                          ) : (
                            <button
                              className="primary small"
                              onClick={() => setCheckInModal({ rider: r, eventRider: er })}
                            >
                              Check in
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredRiders.length > PAGE_SIZE_OPTIONS[0] && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 12,
                    marginTop: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    className="ghost small"
                    onClick={() => setRiderPage((p) => Math.max(0, p - 1))}
                    disabled={riderPage === 0}
                  >
                    Previous
                  </button>
                  <span className="muted small-text">
                    Page {riderPage + 1} of {riderTotalPages} ({filteredRiders.length} riders)
                  </span>
                  <button
                    className="ghost small"
                    onClick={() => setRiderPage((p) => Math.min(riderTotalPages - 1, p + 1))}
                    disabled={riderPage >= riderTotalPages - 1}
                  >
                    Next
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label className="input-label" style={{ marginBottom: 0 }}>
                      Per page
                    </label>
                    <select
                      className="input"
                      value={riderPageSize}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setRiderPageSize(n);
                        try {
                          localStorage.setItem('racetimetracker-event-riders-page-size', String(n));
                        } catch {}
                      }}
                      style={{ width: 72, padding: '6px 8px' }}
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'runs' && (
        <div className="section">
          <div className="section-title" style={{ marginBottom: 8 }}>
            Run Schedule
          </div>
          <p className="muted small-text" style={{ marginBottom: 16 }}>
            Create a schedule of runs for each track using all registered riders. Start time must be
            within the event dates ({event?.startDate} to {event?.endDate}). Riders are ordered by
            category and assigned number.
          </p>

          {scheduleError && (
            <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>
              {scheduleError}
            </div>
          )}

          {sortedEventTracks.length === 0 ? (
            <div className="empty">No tracks assigned to this event. Add tracks first.</div>
          ) : assignedRiders.length === 0 ? (
            <div className="empty">No riders registered. Add riders to create a schedule.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sortedEventTracks.map((et: EventTrack) => {
                const tv = tvMap.get(et.trackVariationId);
                const track = tv ? trackMap.get(tv.trackId) : undefined;
                const trackLabel = track ? `${track.name}${tv ? ` — ${tv.name}` : ''}` : 'Track';
                const trackRuns = runs.filter((r: Run) => r.eventTrackId === et.id);
                const schedule = scheduleByEventTrackId.get(et.id);
                const form = getScheduleForm(et.id);
                const minDatetime = event ? `${event.startDate}T00:00` : '';
                const maxDatetime = event ? `${event.endDate}T23:59` : '';

                return (
                  <div key={String(et.id)} className="card" style={{ padding: 16 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{trackLabel}</h3>
                        <Link
                          to={`/event/${event.slug}/track/${et.id}`}
                          className="small-text"
                          style={{ color: 'var(--accent)' }}
                        >
                          Track timing →
                        </Link>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {schedule && (
                          <span
                            className="badge"
                            style={{ background: 'var(--green-bg)', color: 'var(--green)' }}
                          >
                            {trackRuns.length} run{trackRuns.length !== 1 ? 's' : ''} scheduled
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr auto',
                        gap: 12,
                        alignItems: 'end',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <label className="input-label">Start date & time</label>
                        <input
                          type="datetime-local"
                          className="input"
                          value={form.startDateTime}
                          min={minDatetime}
                          max={maxDatetime}
                          onChange={(e) =>
                            setScheduleForm(et.id, { startDateTime: e.target.value })
                          }
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div>
                          <label className="input-label">Interval between riders</label>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <input
                              type="number"
                              min="1"
                              className="input"
                              value={form.intervalValue}
                              onChange={(e) =>
                                setScheduleForm(et.id, { intervalValue: e.target.value })
                              }
                              style={{ width: 80 }}
                            />
                            <select
                              className="input"
                              value={form.intervalUnit}
                              onChange={(e) =>
                                setScheduleForm(et.id, {
                                  intervalUnit: e.target.value as 'minutes' | 'seconds',
                                })
                              }
                              style={{ width: 100 }}
                            >
                              <option value="minutes">minutes</option>
                              <option value="seconds">seconds</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="primary small"
                          onClick={() => handleGenerateSchedule(et)}
                        >
                          {schedule ? 'Regenerate' : 'Generate'} Schedule
                        </button>
                        {schedule && (
                          <button
                            className="ghost small"
                            onClick={() => handleClearSchedule(et)}
                            style={{ color: 'var(--red)' }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Timekeeper assignments */}
                    <TimekeeperSection
                      eventTrackId={et.id}
                      assignments={timekeeperAssignments}
                      assignableUsers={assignableUsers}
                      onSave={async (startUserId, endUserId) => {
                        setTkAssignError('');
                        try {
                          await setTrackTimekeepers({
                            eventTrackId: et.id,
                            startUserId,
                            endUserId,
                          });
                        } catch (e: unknown) {
                          setTkAssignError(getErrorMessage(e, 'Failed'));
                        }
                      }}
                      error={tkAssignError}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals - outside tab content so they persist when switching tabs */}
      <AddTrackModal
        open={showAddTrackModal}
        onClose={() => setShowAddTrackModal(false)}
        onConfirm={handleAddTrack}
        venueName={venue?.name ?? 'the location'}
        venueTracks={venueTracks}
        allVariations={trackVariations}
        usedVariationIds={usedVariationIds}
      />
      <AddRiderModal
        open={showAddRiderModal}
        onClose={() => setShowAddRiderModal(false)}
        onAdd={handleAddRider}
        availableRiders={unassignedRiders}
      />
      {checkInModal && (
        <CheckInModal
          open={!!checkInModal}
          onClose={() => setCheckInModal(null)}
          onConfirm={async (assignedNumber) => {
            await handleCheckIn(checkInModal.eventRider, assignedNumber);
          }}
          rider={checkInModal.rider}
          eventRider={checkInModal.eventRider}
          defaultNumber={assignedNumberByRiderId.get(checkInModal.rider.id) ?? null}
          categoryName={
            checkInModal.eventRider.categoryId
              ? (categoryMap.get(checkInModal.eventRider.categoryId)?.name ?? null)
              : null
          }
        />
      )}
    </div>
  );
}

function TimekeeperSection({
  eventTrackId,
  assignments,
  assignableUsers,
  onSave,
  error,
}: {
  eventTrackId: bigint;
  assignments: readonly TimekeeperAssignment[];
  assignableUsers: User[];
  onSave: (startUserId: bigint, endUserId: bigint) => void;
  error: string;
}) {
  const trackAssignments = useMemo(
    () => assignments.filter((a: TimekeeperAssignment) => a.eventTrackId === eventTrackId),
    [assignments, eventTrackId]
  );

  const currentStart = useMemo(() => {
    for (const a of trackAssignments) {
      if (a.position === 'start' || a.position === 'both') return a.userId as bigint;
    }
    return 0n;
  }, [trackAssignments]);

  const currentEnd = useMemo(() => {
    for (const a of trackAssignments) {
      if (a.position === 'end' || a.position === 'both') return a.userId as bigint;
    }
    return 0n;
  }, [trackAssignments]);

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
          marginBottom: 8,
        }}
      >
        Timekeepers
      </div>
      {error && (
        <div style={{ color: 'var(--red)', fontSize: '0.8rem', marginBottom: 8 }}>{error}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="input-label">Start line</label>
          <SearchableSelect<User>
            items={assignableUsers}
            value={
              currentStart === 0n
                ? null
                : assignableUsers.find((u) => u.id === currentStart) ?? null
            }
            onChange={(u) => onSave(u?.id ?? 0n, currentEnd)}
            getLabel={(u) => u.name || u.email || ''}
            getKey={(u) => String(u.id)}
            placeholder="Select timekeeper..."
            clearLabel="Unassign"
          />
        </div>
        <div>
          <label className="input-label">Finish line</label>
          <SearchableSelect<User>
            items={assignableUsers}
            value={
              currentEnd === 0n
                ? null
                : assignableUsers.find((u) => u.id === currentEnd) ?? null
            }
            onChange={(u) => onSave(currentStart, u?.id ?? 0n)}
            getLabel={(u) => u.name || u.email || ''}
            getKey={(u) => String(u.id)}
            placeholder="Select timekeeper..."
            clearLabel="Unassign"
          />
        </div>
      </div>
    </div>
  );
}
