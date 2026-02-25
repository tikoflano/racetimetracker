import { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import ImageCarousel from '../components/ImageCarousel';
import type { Venue, Track, TrackVariation, Organization } from '../module_bindings/types';

// Colored circle marker icon
function circleIcon(color: string, size = 12) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function pinIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.4)">${label}</div>
      <div style="width:2px;height:8px;background:${color}"></div>
      <div style="width:8px;height:8px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>
    </div>`,
    iconSize: [40, 30],
    iconAnchor: [20, 30],
  });
}

const START_ICON = pinIcon('#22c55e', 'START');
const END_ICON = pinIcon('#ef4444', 'END');

// Click handler for placing pins on the map
function MapClickHandler({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Auto-fit map bounds to markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useMemo(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [positions, map]);
  return null;
}

export default function VenueDetailView() {
  const { orgId, venueId } = useParams<{ orgId: string; venueId: string }>();
  const oid = BigInt(orgId ?? '0');
  const vid = BigInt(venueId ?? '0');
  const { isAuthenticated, isReady, canManageOrgEvents } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [venues] = useTable(tables.venue);
  const [allTracks] = useTable(tables.track);
  const [allVariations] = useTable(tables.track_variation);

  const updateVenue = useReducer(reducers.updateVenue);
  const createTrack = useReducer(reducers.createTrack);
  const updateTrack = useReducer(reducers.updateTrack);
  const deleteTrack = useReducer(reducers.deleteTrack);
  const createVariation = useReducer(reducers.createTrackVariation);
  const updateVariation = useReducer(reducers.updateTrackVariation);
  const deleteVariation = useReducer(reducers.deleteTrackVariation);

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [editingVenue, setEditingVenue] = useState(false);
  const [venueForm, setVenueForm] = useState({ name: '', description: '', latitude: '', longitude: '' });
  const [showTrackForm, setShowTrackForm] = useState(false);
  const [trackForm, setTrackForm] = useState({ name: '', color: '#3b82f6' });
  const [editingTrackId, setEditingTrackId] = useState<bigint | null>(null);
  const [expandedTrack, setExpandedTrack] = useState<bigint | null>(null);
  const [showVarForm, setShowVarForm] = useState<bigint | null>(null);
  const [varForm, setVarForm] = useState({ name: '', description: '', startLat: '', startLng: '', endLat: '', endLng: '' });
  const [editingVarId, setEditingVarId] = useState<bigint | null>(null);
  const [placingPin, setPlacingPin] = useState<'start' | 'end' | null>(null);
  const [expandedVarImages, setExpandedVarImages] = useState<bigint | null>(null);
  const [error, setError] = useState('');

  const org = orgs.find((o: Organization) => o.id === oid);
  const venue = venues.find((v: Venue) => v.id === vid);
  const hasAccess = canManageOrgEvents(oid);

  const tracks = useMemo(() => {
    return allTracks.filter((t: Track) => t.venueId === vid).sort((a: Track, b: Track) => a.name.localeCompare(b.name));
  }, [allTracks, vid]);

  const variationsByTrack = useMemo(() => {
    const m = new Map<bigint, TrackVariation[]>();
    for (const tv of allVariations) {
      for (const t of tracks) {
        if (tv.trackId === t.id) {
          const arr = m.get(t.id) ?? [];
          arr.push(tv);
          m.set(t.id, arr);
        }
      }
    }
    return m;
  }, [allVariations, tracks]);

  // Get default variation for each track (first one named "Default", or first one)
  const defaultVariations = useMemo(() => {
    const m = new Map<bigint, TrackVariation>();
    for (const [trackId, vars] of variationsByTrack) {
      const def = vars.find(v => v.name === 'Default') ?? vars[0];
      if (def) m.set(trackId, def);
    }
    return m;
  }, [variationsByTrack]);

  // All map positions for bounds fitting
  const mapPositions = useMemo(() => {
    const pts: [number, number][] = [];
    if (venue) pts.push([venue.latitude, venue.longitude]);
    for (const [, tv] of defaultVariations) {
      if (tv.startLatitude !== 0 || tv.startLongitude !== 0) pts.push([tv.startLatitude, tv.startLongitude]);
      if (tv.endLatitude !== 0 || tv.endLongitude !== 0) pts.push([tv.endLatitude, tv.endLongitude]);
    }
    return pts;
  }, [venue, defaultVariations]);

  if (!isReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!org) {
    if (orgs.length === 0) return null;
    return <div className="empty">Organization not found.</div>;
  }
  if (!hasAccess) return <div className="empty">Access denied.</div>;
  if (!venue) {
    if (venues.length === 0) return null;
    return <div className="empty">Venue not found.</div>;
  }

  // Venue edit
  const startEditVenue = () => {
    setVenueForm({ name: venue.name, description: venue.description, latitude: String(venue.latitude), longitude: String(venue.longitude) });
    setEditingVenue(true);
    setError('');
  };
  const saveVenue = async () => {
    setError('');
    if (!venueForm.name.trim()) { setError('Name is required'); return; }
    try {
      await updateVenue({ venueId: vid, name: venueForm.name.trim(), description: venueForm.description.trim(), latitude: parseFloat(venueForm.latitude) || 0, longitude: parseFloat(venueForm.longitude) || 0 });
      setEditingVenue(false);
    } catch (e: any) { setError(e?.message || 'Failed'); }
  };

  // Track create/edit
  const startEditTrack = (t: Track) => {
    setTrackForm({ name: t.name, color: t.color });
    setEditingTrackId(t.id);
    setShowTrackForm(true);
    setError('');
  };
  const resetTrackForm = () => { setTrackForm({ name: '', color: '#3b82f6' }); setEditingTrackId(null); setShowTrackForm(false); setError(''); };
  const handleTrackSubmit = async () => {
    setError('');
    if (!trackForm.name.trim()) { setError('Track name is required'); return; }
    try {
      if (editingTrackId !== null) {
        await updateTrack({ trackId: editingTrackId, name: trackForm.name.trim(), color: trackForm.color });
      } else {
        await createTrack({ venueId: vid, name: trackForm.name.trim(), color: trackForm.color });
      }
      resetTrackForm();
    } catch (e: any) { setError(e?.message || 'Failed'); }
  };
  const handleDeleteTrack = async (t: Track) => {
    if (!confirm(`Delete "${t.name}" and all its variations?`)) return;
    try { await deleteTrack({ trackId: t.id }); } catch (e: any) { setError(e?.message || 'Failed'); }
  };

  // Variation create/edit
  const startAddVar = (trackId: bigint) => {
    setVarForm({ name: '', description: '', startLat: '', startLng: '', endLat: '', endLng: '' });
    setEditingVarId(null);
    setShowVarForm(trackId);
    setPlacingPin('start');
    setError('');
  };
  const startEditVar = (tv: TrackVariation) => {
    setVarForm({ name: tv.name, description: tv.description, startLat: String(tv.startLatitude), startLng: String(tv.startLongitude), endLat: String(tv.endLatitude), endLng: String(tv.endLongitude) });
    setEditingVarId(tv.id);
    setShowVarForm(tv.trackId);
    setPlacingPin(null);
    setError('');
  };
  const resetVarForm = () => { setVarForm({ name: '', description: '', startLat: '', startLng: '', endLat: '', endLng: '' }); setEditingVarId(null); setShowVarForm(null); setPlacingPin(null); setError(''); };
  const handleVarSubmit = async () => {
    setError('');
    if (!varForm.name.trim()) { setError('Variation name is required'); return; }
    try {
      const data = {
        name: varForm.name.trim(),
        description: varForm.description.trim(),
        startLatitude: parseFloat(varForm.startLat) || 0,
        startLongitude: parseFloat(varForm.startLng) || 0,
        endLatitude: parseFloat(varForm.endLat) || 0,
        endLongitude: parseFloat(varForm.endLng) || 0,
      };
      if (editingVarId !== null) {
        await updateVariation({ variationId: editingVarId, ...data });
      } else {
        await createVariation({ trackId: showVarForm!, ...data });
      }
      resetVarForm();
    } catch (e: any) { setError(e?.message || 'Failed'); }
  };
  const handleDeleteVar = async (tv: TrackVariation) => {
    if (!confirm(`Delete variation "${tv.name}"?`)) return;
    try { await deleteVariation({ variationId: tv.id }); } catch (e: any) { setError(e?.message || 'Failed'); }
  };

  return (
    <div>
      <Link to={`/org/${orgId}/venues`} className="back-link">&larr; Venues</Link>

      {/* Venue header */}
      {editingVenue ? (
        <div className="card" style={{ marginBottom: 20 }}>
          {error && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="text" value={venueForm.name} onChange={e => setVenueForm(f => ({ ...f, name: e.target.value }))} className="input" autoFocus />
            <input type="text" value={venueForm.description} onChange={e => setVenueForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="input" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><label className="input-label">Latitude</label><input type="number" step="any" value={venueForm.latitude} onChange={e => setVenueForm(f => ({ ...f, latitude: e.target.value }))} className="input" /></div>
              <div><label className="input-label">Longitude</label><input type="number" step="any" value={venueForm.longitude} onChange={e => setVenueForm(f => ({ ...f, longitude: e.target.value }))} className="input" /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="primary small" onClick={saveVenue}>Save</button>
              <button className="ghost small" onClick={() => setEditingVenue(false)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ marginBottom: 0 }}>{venue.name}</h1>
            <button className="ghost small" onClick={startEditVenue} title="Edit">&#9998;</button>
          </div>
          {venue.description && <p className="muted small-text">{venue.description}</p>}
          <p className="muted small-text">{venue.latitude.toFixed(4)}, {venue.longitude.toFixed(4)}</p>
        </div>
      )}

      {/* Venue images */}
      <ImageCarousel entityType="venue" entityId={vid} canEdit={hasAccess} />

      {/* Tracks section */}
      <div className="section" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            Tracks <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 400 }}>({tracks.length})</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className={viewMode === 'map' ? 'primary small' : 'ghost small'} onClick={() => setViewMode('map')}>Map</button>
              <button className={viewMode === 'list' ? 'primary small' : 'ghost small'} onClick={() => setViewMode('list')}>List</button>
            </div>
            {!showTrackForm && (
              <button className="primary small" onClick={() => { setEditingTrackId(null); setTrackForm({ name: '', color: '#3b82f6' }); setShowTrackForm(true); setError(''); }}>+ Add Track</button>
            )}
          </div>
        </div>
      </div>

      {error && !editingVenue && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</div>}

      {/* Track create/edit form */}
      {showTrackForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>{editingTrackId ? 'Edit Track' : 'New Track'}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label className="input-label">Name</label>
              <input type="text" value={trackForm.name} onChange={e => setTrackForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleTrackSubmit()} className="input" autoFocus />
            </div>
            <div>
              <label className="input-label">Color</label>
              <input type="color" value={trackForm.color} onChange={e => setTrackForm(f => ({ ...f, color: e.target.value }))} className="color-input" />
            </div>
            <button className="primary small" onClick={handleTrackSubmit}>{editingTrackId ? 'Save' : 'Create'}</button>
            <button className="ghost small" onClick={resetTrackForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* Map view */}
      {viewMode === 'map' && (
        <div className="venue-map-container" style={{ marginBottom: 20 }}>
          <MapContainer
            center={[venue.latitude, venue.longitude]}
            zoom={14}
            style={{ height: 400, width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds positions={mapPositions} />
            {tracks.map((track: Track) => {
              const tv = defaultVariations.get(track.id);
              if (!tv) return null;
              const start: [number, number] = [tv.startLatitude, tv.startLongitude];
              const end: [number, number] = [tv.endLatitude, tv.endLongitude];
              const hasCoords = (tv.startLatitude !== 0 || tv.startLongitude !== 0);
              if (!hasCoords) return null;
              return (
                <span key={String(track.id)}>
                  <Marker position={start} icon={circleIcon(track.color, 14)}>
                    <Popup><strong>{track.name}</strong><br />Start — {tv.name}</Popup>
                  </Marker>
                  <Marker position={end} icon={circleIcon(track.color, 10)}>
                    <Popup><strong>{track.name}</strong><br />End — {tv.name}</Popup>
                  </Marker>
                  <Polyline positions={[start, end]} pathOptions={{ color: track.color, weight: 3, dashArray: '6 4' }} />
                </span>
              );
            })}
          </MapContainer>
          {/* Map legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            {tracks.map((t: Track) => (
              <div key={String(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                <span className="color-dot" style={{ background: t.color }} />
                <span className="muted">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List view / Tracks */}
      {tracks.length === 0 && !showTrackForm ? (
        <div className="empty">No tracks yet. Add one to get started.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tracks.map((track: Track) => {
            const vars = variationsByTrack.get(track.id) ?? [];
            const isExpanded = expandedTrack === track.id;
            return (
              <div key={String(track.id)} className="card" style={{ padding: 0 }}>
                {/* Track header */}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}
                  onClick={() => setExpandedTrack(isExpanded ? null : track.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="color-dot" style={{ background: track.color }} />
                    <strong>{track.name}</strong>
                    <span className="muted small-text">({vars.length} variation{vars.length !== 1 ? 's' : ''})</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                      <button className="ghost small" onClick={() => startEditTrack(track)} title="Edit">&#9998;</button>
                      <button className="ghost small" onClick={() => handleDeleteTrack(track)} title="Delete" style={{ color: 'var(--red)' }}>&times;</button>
                    </div>
                    <span className="muted" style={{ fontSize: '0.7rem', padding: '4px 8px', cursor: 'pointer' }}>{isExpanded ? '\u25B2' : '\u25BC'}</span>
                  </div>
                </div>

                {/* Expanded: images + variations */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
                    <ImageCarousel entityType="track" entityId={track.id} canEdit={hasAccess} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div className="section-title" style={{ marginBottom: 0 }}>Variations</div>
                      <button className="primary small" onClick={() => startAddVar(track.id)}>+ Add</button>
                    </div>

                    {/* Variation form */}
                    {showVarForm === track.id && (() => {
                      const hasStart = varForm.startLat !== '' && varForm.startLng !== '';
                      const hasEnd = varForm.endLat !== '' && varForm.endLng !== '';
                      const startPos: [number, number] | null = hasStart ? [parseFloat(varForm.startLat), parseFloat(varForm.startLng)] : null;
                      const endPos: [number, number] | null = hasEnd ? [parseFloat(varForm.endLat), parseFloat(varForm.endLng)] : null;
                      const handleMapPlace = (lat: number, lng: number) => {
                        if (placingPin === 'start') {
                          setVarForm(f => ({ ...f, startLat: lat.toFixed(6), startLng: lng.toFixed(6) }));
                          setPlacingPin(hasEnd ? null : 'end');
                        } else if (placingPin === 'end') {
                          setVarForm(f => ({ ...f, endLat: lat.toFixed(6), endLng: lng.toFixed(6) }));
                          setPlacingPin(null);
                        } else if (!hasStart) {
                          setVarForm(f => ({ ...f, startLat: lat.toFixed(6), startLng: lng.toFixed(6) }));
                          setPlacingPin('end');
                        } else if (!hasEnd) {
                          setVarForm(f => ({ ...f, endLat: lat.toFixed(6), endLng: lng.toFixed(6) }));
                          setPlacingPin(null);
                        }
                      };
                      return (
                        <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 8 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <div><label className="input-label">Name *</label><input type="text" value={varForm.name} onChange={e => setVarForm(f => ({ ...f, name: e.target.value }))} className="input" autoFocus /></div>
                              <div><label className="input-label">Description</label><input type="text" value={varForm.description} onChange={e => setVarForm(f => ({ ...f, description: e.target.value }))} className="input" /></div>
                            </div>

                            {/* Pin placement map */}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <label className="input-label" style={{ marginBottom: 0 }}>Drop pins on the map</label>
                                <button
                                  className={`ghost small ${placingPin === 'start' ? 'pin-active-start' : ''}`}
                                  onClick={() => setPlacingPin(placingPin === 'start' ? null : 'start')}
                                  style={placingPin === 'start' ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e' } : {}}
                                >
                                  {hasStart ? 'Move Start' : 'Place Start'}
                                </button>
                                <button
                                  className={`ghost small ${placingPin === 'end' ? 'pin-active-end' : ''}`}
                                  onClick={() => setPlacingPin(placingPin === 'end' ? null : 'end')}
                                  style={placingPin === 'end' ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' } : {}}
                                >
                                  {hasEnd ? 'Move End' : 'Place End'}
                                </button>
                              </div>
                              {placingPin && (
                                <div className="small-text" style={{ marginBottom: 4, color: placingPin === 'start' ? '#22c55e' : '#ef4444' }}>
                                  Click on the map to place the {placingPin} pin
                                </div>
                              )}
                              {!placingPin && !hasStart && (
                                <div className="small-text muted" style={{ marginBottom: 4 }}>
                                  Click on the map to place the start pin
                                </div>
                              )}
                              <div className="venue-map-container">
                                <MapContainer
                                  center={[venue.latitude, venue.longitude]}
                                  zoom={14}
                                  style={{ height: 280, width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)', cursor: placingPin ? 'crosshair' : '' }}
                                >
                                  <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                  />
                                  <MapClickHandler onPlace={handleMapPlace} />
                                  {startPos && <Marker position={startPos} icon={START_ICON} />}
                                  {endPos && <Marker position={endPos} icon={END_ICON} />}
                                  {startPos && endPos && (
                                    <Polyline positions={[startPos, endPos]} pathOptions={{ color: track.color, weight: 3, dashArray: '6 4' }} />
                                  )}
                                </MapContainer>
                              </div>
                              {/* Coordinate readout */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6, fontSize: '0.75rem' }}>
                                <div className="muted">
                                  Start: {hasStart ? `${varForm.startLat}, ${varForm.startLng}` : 'not set'}
                                </div>
                                <div className="muted">
                                  End: {hasEnd ? `${varForm.endLat}, ${varForm.endLng}` : 'not set'}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="primary small" onClick={handleVarSubmit}>{editingVarId ? 'Save' : 'Add'}</button>
                              <button className="ghost small" onClick={resetVarForm}>Cancel</button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Variation list */}
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Description</th>
                          <th>Start</th>
                          <th>End</th>
                          <th style={{ width: 80 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {vars.map((tv: TrackVariation) => (
                          <tr key={String(tv.id)} style={{ cursor: 'pointer' }} onClick={() => setExpandedVarImages(expandedVarImages === tv.id ? null : tv.id)}>
                            <td>{tv.name}</td>
                            <td className="muted small-text">{tv.description || '—'}</td>
                            <td className="muted small-text">{tv.startLatitude.toFixed(4)}, {tv.startLongitude.toFixed(4)}</td>
                            <td className="muted small-text">{tv.endLatitude.toFixed(4)}, {tv.endLongitude.toFixed(4)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                <button className="ghost small" onClick={() => startEditVar(tv)} title="Edit">&#9998;</button>
                                {vars.length > 1 && (
                                  <button className="ghost small" onClick={() => handleDeleteVar(tv)} title="Delete" style={{ color: 'var(--red)' }}>&times;</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {expandedVarImages && vars.some(v => v.id === expandedVarImages) && (
                          <tr>
                            <td colSpan={5} style={{ padding: 12 }}>
                              <ImageCarousel entityType="track_variation" entityId={expandedVarImages} canEdit={hasAccess} />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
