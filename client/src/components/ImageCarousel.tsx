import { useState, useMemo } from 'react';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { Image } from '../module_bindings/types';

interface Props {
  entityType: string;
  entityId: bigint;
  canEdit?: boolean;
}

export default function ImageCarousel({ entityType, entityId, canEdit = false }: Props) {
  const [images] = useTable(tables.image);
  const deleteImage = useReducer(reducers.deleteImage);
  const addImage = useReducer(reducers.addImage);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploading, setUploading] = useState(false);

  const entityImages = useMemo(() => {
    return images
      .filter((img: Image) => img.entityType === entityType && img.entityId === entityId)
      .sort((a: Image, b: Image) => a.sortOrder - b.sortOrder);
  }, [images, entityType, entityId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      // Resize to max 800px and compress
      const dataUri = await resizeImage(file, 800, 0.7);
      try {
        await addImage({ entityType, entityId, data: dataUri, caption: '' });
      } catch (err) {
        console.error('Failed to upload image:', err);
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (imgId: bigint) => {
    if (!confirm('Delete this image?')) return;
    try {
      await deleteImage({ imageId: imgId });
      if (currentIndex >= entityImages.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    } catch (err) {
      console.error('Failed to delete image:', err);
    }
  };

  const prev = () => setCurrentIndex(i => (i > 0 ? i - 1 : entityImages.length - 1));
  const next = () => setCurrentIndex(i => (i < entityImages.length - 1 ? i + 1 : 0));

  // Clamp index
  const idx = entityImages.length > 0 ? Math.min(currentIndex, entityImages.length - 1) : 0;
  const current = entityImages[idx];

  if (entityImages.length === 0 && !canEdit) return null;

  return (
    <div className="img-carousel">
      {entityImages.length > 0 ? (
        <>
          <div className="img-carousel-main">
            {entityImages.length > 1 && (
              <button className="img-carousel-arrow left" onClick={prev}>&lsaquo;</button>
            )}
            <img src={current.data} alt={current.caption || 'Image'} className="img-carousel-img" />
            {entityImages.length > 1 && (
              <button className="img-carousel-arrow right" onClick={next}>&rsaquo;</button>
            )}
            {canEdit && (
              <button
                className="img-carousel-delete"
                onClick={() => handleDelete(current.id)}
                title="Delete image"
              >
                &times;
              </button>
            )}
          </div>
          {current.caption && <p className="img-carousel-caption">{current.caption}</p>}
          {entityImages.length > 1 && (
            <div className="img-carousel-dots">
              {entityImages.map((_, i) => (
                <button
                  key={i}
                  className={`img-carousel-dot${i === idx ? ' active' : ''}`}
                  onClick={() => setCurrentIndex(i)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="img-carousel-empty">No images</div>
      )}
      {canEdit && (
        <label className="img-carousel-upload">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <span className="primary small" style={{ cursor: 'pointer', display: 'inline-block', padding: '6px 12px', borderRadius: 'var(--radius)', background: 'var(--accent)', color: 'white', fontSize: '0.8rem' }}>
            {uploading ? 'Uploading...' : '+ Add Image'}
          </span>
        </label>
      )}
    </div>
  );
}

// Resize image client-side before uploading
function resizeImage(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
