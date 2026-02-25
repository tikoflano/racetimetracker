import { useState, useMemo } from 'react';
import Modal from './Modal';
import type { Track, TrackVariation } from '../module_bindings/types';

interface AddTrackModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (trackVariationId: bigint) => void;
  venueName: string;
  venueTracks: readonly Track[];
  allVariations: readonly TrackVariation[];
}

export default function AddTrackModal({ open, onClose, onConfirm, venueName, venueTracks, allVariations }: AddTrackModalProps) {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<TrackVariation | null>(null);
  const [trackSearch, setTrackSearch] = useState('');
  const [varSearch, setVarSearch] = useState('');

  const reset = () => {
    setSelectedTrack(null);
    setSelectedVariation(null);
    setTrackSearch('');
    setVarSearch('');
  };

  const handleClose = () => { reset(); onClose(); };

  const availableTracks = useMemo(() => {
    return venueTracks.filter(track => {
      return allVariations.some(tv => tv.trackId === track.id);
    });
  }, [venueTracks, allVariations]);

  const filteredTracks = useMemo(() => {
    const q = trackSearch.toLowerCase().trim();
    if (!q) return availableTracks;
    return availableTracks.filter(t => t.name.toLowerCase().includes(q));
  }, [availableTracks, trackSearch]);

  const availableVariations = useMemo(() => {
    if (!selectedTrack) return [];
    return allVariations.filter(tv => tv.trackId === selectedTrack.id);
  }, [selectedTrack, allVariations]);

  const filteredVariations = useMemo(() => {
    const q = varSearch.toLowerCase().trim();
    if (!q) return availableVariations;
    return availableVariations.filter(tv => tv.name.toLowerCase().includes(q));
  }, [availableVariations, varSearch]);

  const handleConfirm = () => {
    if (!selectedVariation) return;
    onConfirm(selectedVariation.id);
    reset();
  };

  return (
    <Modal open={open} onClose={handleClose} title={`Add Track from ${venueName}`}>
      {/* Step 1: Select track */}
      {!selectedTrack && (
        <div>
          <input
            type="text"
            className="input"
            placeholder="Search tracks..."
            value={trackSearch}
            onChange={e => setTrackSearch(e.target.value)}
            autoFocus
          />
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 300, overflowY: 'auto' }}>
            {filteredTracks.length === 0 ? (
              <div className="muted small-text" style={{ padding: 8 }}>
                {availableTracks.length === 0 ? 'No tracks available from this venue.' : 'No tracks match your search.'}
              </div>
            ) : (
              filteredTracks.map(track => (
                <button
                  key={String(track.id)}
                  className="ghost small"
                  style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 'var(--radius)' }}
                  onClick={() => { setSelectedTrack(track); setVarSearch(''); setSelectedVariation(null); }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="color-dot" style={{ background: track.color }} />
                    <strong>{track.name}</strong>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Step 2: Select variation */}
      {selectedTrack && !selectedVariation && (
        <div>
          <button className="ghost small" onClick={() => setSelectedTrack(null)} style={{ marginBottom: 8 }}>
            &larr; Back to tracks
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="color-dot" style={{ background: selectedTrack.color }} />
            <strong>{selectedTrack.name}</strong>
          </div>
          <input
            type="text"
            className="input"
            placeholder="Search variations..."
            value={varSearch}
            onChange={e => setVarSearch(e.target.value)}
            autoFocus
          />
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 300, overflowY: 'auto' }}>
            {filteredVariations.length === 0 ? (
              <div className="muted small-text" style={{ padding: 8 }}>
                {availableVariations.length === 0 ? 'No variations available.' : 'No variations match your search.'}
              </div>
            ) : (
              filteredVariations.map(tv => (
                <button
                  key={String(tv.id)}
                  className="ghost small"
                  style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 'var(--radius)' }}
                  onClick={() => setSelectedVariation(tv)}
                >
                  <div>
                    <strong>{tv.name}</strong>
                    {tv.description && <div className="muted small-text" style={{ marginTop: 2 }}>{tv.description}</div>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {selectedTrack && selectedVariation && (
        <div>
          <button className="ghost small" onClick={() => setSelectedVariation(null)} style={{ marginBottom: 8 }}>
            &larr; Back to variations
          </button>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="color-dot" style={{ background: selectedTrack.color }} />
              <strong>{selectedTrack.name}</strong>
              <span className="muted">—</span>
              <span>{selectedVariation.name}</span>
            </div>
            {selectedVariation.description && (
              <p className="muted small-text">{selectedVariation.description}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary small" onClick={handleConfirm}>Add Track</button>
            <button className="ghost small" onClick={handleClose}>Cancel</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
