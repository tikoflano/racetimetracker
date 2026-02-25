import { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import AddRacerModal from '../components/AddRacerModal';
import type { Event, EventCategory, Rider, EventRider } from '../module_bindings/types';

export default function EventManageView() {
  const { eventId } = useParams<{ eventId: string }>();
  const eid = BigInt(eventId ?? '0');
  const { isAuthenticated, isReady, canOrganizeEvent } = useAuth();

  const [events] = useTable(tables.event);
  const [allCategories] = useTable(tables.event_category);
  const [allRiders] = useTable(tables.rider);
  const [eventRiders] = useTable(tables.event_rider);

  const createCategory = useReducer(reducers.createEventCategory);
  const updateCategory = useReducer(reducers.updateEventCategory);
  const deleteCategory = useReducer(reducers.deleteEventCategory);
  const importCategories = useReducer(reducers.importCategoriesFromEvent);
  const addRiderToEvent = useReducer(reducers.addRiderToEvent);
  const importRiders = useReducer(reducers.importRidersFromEvent);
  const updateEventRider = useReducer(reducers.updateEventRider);

  const event = events.find((e: Event) => e.id === eid);
  const canEdit = event ? canOrganizeEvent(eid, event.orgId) : false;

  const categories = useMemo(() => {
    return allCategories
      .filter((c: EventCategory) => c.eventId === eid)
      .sort((a: EventCategory, b: EventCategory) => a.numberRangeStart - b.numberRangeStart);
  }, [allCategories, eid]);

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
      eventRiders
        .filter((er: EventRider) => er.eventId === eid)
        .map((er: EventRider) => er.riderId)
    );
  }, [eventRiders, eid]);

  const orgRiders = useMemo(() => {
    if (!event) return [];
    return allRiders
      .filter((r: Rider) => r.orgId === event.orgId)
      .sort((a: Rider, b: Rider) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
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

  // Category form state
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState<bigint | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', rangeStart: '', rangeEnd: '' });
  const [catError, setCatError] = useState('');

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importError, setImportError] = useState('');

  // Racer state
  const [showAddRacerModal, setShowAddRacerModal] = useState(false);
  const [showImportRacers, setShowImportRacers] = useState(false);
  const [racerError, setRacerError] = useState('');
  const [importRacerError, setImportRacerError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all'); // 'all' | 'none' | category id as string

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

  const checkOverlap = (rangeStart: number, rangeEnd: number, excludeId: bigint | null): string | null => {
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
    if (!catForm.name.trim()) { setCatError('Name is required'); return; }
    const rangeStart = parseInt(catForm.rangeStart) || 0;
    const rangeEnd = parseInt(catForm.rangeEnd) || 0;
    if (rangeStart > rangeEnd) { setCatError('Range start must be <= range end'); return; }
    const overlap = checkOverlap(rangeStart, rangeEnd, editingCatId);
    if (overlap) { setCatError(overlap); return; }
    try {
      if (editingCatId !== null) {
        await updateCategory({ categoryId: editingCatId, name: catForm.name.trim(), description: catForm.description.trim(), numberRangeStart: rangeStart, numberRangeEnd: rangeEnd });
      } else {
        await createCategory({ eventId: eid, name: catForm.name.trim(), description: catForm.description.trim(), numberRangeStart: rangeStart, numberRangeEnd: rangeEnd });
      }
      resetCatForm();
    } catch (e: any) { setCatError(e?.message || 'Failed'); }
  };

  const handleDeleteCat = async (cat: EventCategory) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await deleteCategory({ categoryId: cat.id });
    } catch (e: any) { setCatError(e?.message || 'Failed'); }
  };

  const handleImport = async (sourceEventId: bigint) => {
    setImportError('');
    try {
      await importCategories({ targetEventId: eid, sourceEventId });
      setShowImport(false);
    } catch (e: any) { setImportError(e?.message || 'Failed'); }
  };

  const handleAddRider = async (riderId: bigint) => {
    setRacerError('');
    try {
      await addRiderToEvent({ eventId: eid, riderId });
    } catch (e: any) { setRacerError(e?.message || 'Failed'); }
  };

  const handleImportRiders = async (sourceEventId: bigint) => {
    setImportRacerError('');
    try {
      await importRiders({ targetEventId: eid, sourceEventId });
      setShowImportRacers(false);
    } catch (e: any) { setImportRacerError(e?.message || 'Failed'); }
  };

  const handleToggleCheckIn = async (er: EventRider) => {
    setRacerError('');
    try {
      await updateEventRider({ eventRiderId: er.id, categoryId: er.categoryId, checkedIn: !er.checkedIn });
    } catch (e: any) { setRacerError(e?.message || 'Failed'); }
  };

  const handleChangeCategory = async (er: EventRider, newCategoryId: bigint) => {
    setRacerError('');
    try {
      await updateEventRider({ eventRiderId: er.id, categoryId: newCategoryId, checkedIn: er.checkedIn });
    } catch (e: any) { setRacerError(e?.message || 'Failed'); }
  };

  if (!isReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!event) {
    if (events.length === 0) return null;
    return <div className="empty">Event not found.</div>;
  }
  if (!canEdit) return <div className="empty">Access denied.</div>;

  const assignedRiders = orgRiders.filter(r => eventRiderIds.has(r.id));
  const unassignedRiders = orgRiders.filter(r => !eventRiderIds.has(r.id));

  return (
    <div>
      <Link to={`/event/${eventId}`} className="back-link">&larr; Back to Event</Link>
      <h1 style={{ marginBottom: 4 }}>Manage: {event.name}</h1>
      <p className="muted small-text" style={{ marginBottom: 20 }}>{event.description}</p>

      {/* Categories section */}
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            Categories <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 400 }}>({categories.length})</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!showCatForm && (
              <>
                <button className="ghost small" onClick={() => { setShowImport(!showImport); setImportError(''); }}>
                  {showImport ? 'Cancel Import' : 'Import'}
                </button>
                <button className="primary small" onClick={() => { setShowCatForm(true); setEditingCatId(null); setCatForm({ name: '', description: '', rangeStart: '', rangeEnd: '' }); setCatError(''); }}>
                  + Add Category
                </button>
              </>
            )}
          </div>
        </div>

        {catError && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>{catError}</div>}

        {/* Import from another event */}
        {showImport && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 8, fontSize: '0.85rem' }}>Import categories from another event</div>
            {importError && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>{importError}</div>}
            {otherEvents.length === 0 ? (
              <div className="muted small-text">No other events in this organization.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {otherEvents.filter(e => categoriesByEvent.has(e.id)).map((evt: Event) => {
                  const cats = categoriesByEvent.get(evt.id) ?? [];
                  return (
                    <div key={String(evt.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 'var(--radius)', background: 'var(--bg)' }}>
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{evt.name}</strong>
                        <span className="muted small-text" style={{ marginLeft: 8 }}>
                          {cats.length} categor{cats.length === 1 ? 'y' : 'ies'}: {cats.map(c => c.name).join(', ')}
                        </span>
                      </div>
                      <button className="primary small" onClick={() => handleImport(evt.id)}>Import</button>
                    </div>
                  );
                })}
                {otherEvents.every(e => !categoriesByEvent.has(e.id)) && (
                  <div className="muted small-text">No other events have categories defined.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Category form */}
        {showCatForm && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 8 }}>{editingCatId ? 'Edit Category' : 'New Category'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label className="input-label">Name *</label>
                <input type="text" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} className="input" autoFocus />
              </div>
              <div>
                <label className="input-label">Description</label>
                <input type="text" value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} className="input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label className="input-label">Number Range Start</label>
                  <input type="number" min="0" value={catForm.rangeStart} onChange={e => setCatForm(f => ({ ...f, rangeStart: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="input-label">Number Range End</label>
                  <input type="number" min="0" value={catForm.rangeEnd} onChange={e => setCatForm(f => ({ ...f, rangeEnd: e.target.value }))} className="input" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="primary small" onClick={handleCatSubmit}>{editingCatId ? 'Save' : 'Create'}</button>
                <button className="ghost small" onClick={resetCatForm}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Category list */}
        {categories.length === 0 && !showCatForm ? (
          <div className="empty">No categories defined. Add one or import from another event.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Number Range</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat: EventCategory) => (
                <tr key={String(cat.id)}>
                  <td><strong>{cat.name}</strong></td>
                  <td className="muted small-text">{cat.description || '—'}</td>
                  <td className="muted small-text">{cat.numberRangeStart} – {cat.numberRangeEnd}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="ghost small" onClick={() => startEditCat(cat)} title="Edit">&#9998;</button>
                      <button className="ghost small" onClick={() => handleDeleteCat(cat)} title="Delete" style={{ color: 'var(--red)' }}>&times;</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Racers section */}
      <div className="section" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            Racers <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 400 }}>({assignedRiders.length})</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ghost small" onClick={() => { setShowImportRacers(!showImportRacers); setImportRacerError(''); }}>
              {showImportRacers ? 'Cancel Import' : 'Import'}
            </button>
            <button className="primary small" onClick={() => setShowAddRacerModal(true)}>
              + Add Racers
            </button>
          </div>
        </div>

        {racerError && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>{racerError}</div>}

        {/* Import racers from another event */}
        {showImportRacers && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 8, fontSize: '0.85rem' }}>Import racers from another event</div>
            {importRacerError && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>{importRacerError}</div>}
            {otherEvents.length === 0 ? (
              <div className="muted small-text">No other events in this organization.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {otherEvents.filter(e => riderCountByEvent.has(e.id)).map((evt: Event) => {
                  const count = riderCountByEvent.get(evt.id) ?? 0;
                  return (
                    <div key={String(evt.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 'var(--radius)', background: 'var(--bg)' }}>
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{evt.name}</strong>
                        <span className="muted small-text" style={{ marginLeft: 8 }}>
                          {count} racer{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <button className="primary small" onClick={() => handleImportRiders(evt.id)}>Import</button>
                    </div>
                  );
                })}
                {otherEvents.every(e => !riderCountByEvent.has(e.id)) && (
                  <div className="muted small-text">No other events have racers assigned.</div>
                )}
              </div>
            )}
          </div>
        )}

        <AddRacerModal
          open={showAddRacerModal}
          onClose={() => setShowAddRacerModal(false)}
          onAdd={handleAddRider}
          availableRiders={unassignedRiders}
        />

        {/* Category filter */}
        {assignedRiders.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <select
              className="input"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ width: 'auto', minWidth: 180 }}
            >
              <option value="all">All Categories</option>
              <option value="none">No Category</option>
              {categories.map(cat => (
                <option key={String(cat.id)} value={String(cat.id)}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        {assignedRiders.length === 0 ? (
          <div className="empty">No racers assigned to this event.</div>
        ) : (() => {
          const filteredRiders = assignedRiders.filter(r => {
            const er = eventRiderMap.get(r.id);
            if (!er) return false;
            if (categoryFilter === 'all') return true;
            if (categoryFilter === 'none') return er.categoryId === 0n;
            return er.categoryId === BigInt(categoryFilter);
          });
          return filteredRiders.length === 0 ? (
            <div className="empty">No racers match this filter.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>&#10003;</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {filteredRiders.map((r: Rider) => {
                  const er = eventRiderMap.get(r.id);
                  if (!er) return null;
                  return (
                    <tr key={String(r.id)}>
                      <td>
                        <input
                          type="checkbox"
                          checked={er.checkedIn}
                          onChange={() => handleToggleCheckIn(er)}
                          title={er.checkedIn ? 'Checked in' : 'Not checked in'}
                        />
                      </td>
                      <td>{r.firstName} {r.lastName}</td>
                      <td>
                        <select
                          className="input"
                          value={String(er.categoryId)}
                          onChange={e => handleChangeCategory(er, BigInt(e.target.value))}
                          style={{ width: 'auto', minWidth: 120, padding: '2px 6px', fontSize: '0.8rem' }}
                        >
                          <option value="0">—</option>
                          {categories.map(cat => (
                            <option key={String(cat.id)} value={String(cat.id)}>{cat.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="muted small-text">{r.email || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
      </div>
    </div>
  );
}
