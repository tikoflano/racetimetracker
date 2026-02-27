import { useState, useMemo, useEffect } from 'react';
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

  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const entityImages = useMemo(() => {
    return images
      .filter((img: Image) => img.entityType === entityType && img.entityId === entityId)
      .sort((a: Image, b: Image) => a.sortOrder - b.sortOrder);
  }, [images, entityType, entityId]);

  // Keyboard navigation in modal
  useEffect(() => {
    if (modalIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalIndex(null);
      if (e.key === 'ArrowLeft')
        setModalIndex((i) => (i !== null && i > 0 ? i - 1 : entityImages.length - 1));
      if (e.key === 'ArrowRight')
        setModalIndex((i) => (i !== null && i < entityImages.length - 1 ? i + 1 : 0));
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [modalIndex, entityImages.length]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
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
      if (modalIndex !== null) {
        if (entityImages.length <= 1) setModalIndex(null);
        else if (modalIndex >= entityImages.length - 1) setModalIndex(modalIndex - 1);
      }
    } catch (err) {
      console.error('Failed to delete image:', err);
    }
  };

  // Clamp modal index
  const idx = modalIndex !== null ? Math.min(modalIndex, entityImages.length - 1) : 0;
  const modalImage = entityImages[idx];

  if (entityImages.length === 0 && !canEdit) return null;

  return (
    <>
      {/* Thumbnail strip */}
      <div className="img-thumbs">
        {entityImages.map((img: Image, i: number) => (
          <div key={String(img.id)} className="img-thumb" onClick={() => setModalIndex(i)}>
            <img src={img.data} alt={img.caption || 'Image'} />
          </div>
        ))}
        {canEdit && (
          <label className="img-thumb img-thumb-add">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {uploading ? '...' : '+'}
          </label>
        )}
        {entityImages.length === 0 && !canEdit && (
          <span className="muted small-text">No images</span>
        )}
      </div>

      {/* Modal viewer */}
      {modalIndex !== null && modalImage && (
        <div className="img-modal-overlay" onClick={() => setModalIndex(null)}>
          <div className="img-modal" onClick={(e) => e.stopPropagation()}>
            {/* Close */}
            <button className="img-modal-close" onClick={() => setModalIndex(null)}>
              &times;
            </button>

            {/* Image */}
            <div className="img-modal-main">
              {entityImages.length > 1 && (
                <button
                  className="img-carousel-arrow left"
                  onClick={() => setModalIndex(idx > 0 ? idx - 1 : entityImages.length - 1)}
                >
                  &lsaquo;
                </button>
              )}
              <img
                src={modalImage.data}
                alt={modalImage.caption || 'Image'}
                className="img-modal-img"
              />
              {entityImages.length > 1 && (
                <button
                  className="img-carousel-arrow right"
                  onClick={() => setModalIndex(idx < entityImages.length - 1 ? idx + 1 : 0)}
                >
                  &rsaquo;
                </button>
              )}
            </div>

            {/* Footer: caption, dots, delete */}
            <div className="img-modal-footer">
              {modalImage.caption && <p className="img-carousel-caption">{modalImage.caption}</p>}
              {entityImages.length > 1 && (
                <div className="img-carousel-dots">
                  {entityImages.map((_, i) => (
                    <button
                      key={i}
                      className={`img-carousel-dot${i === idx ? ' active' : ''}`}
                      onClick={() => setModalIndex(i)}
                    />
                  ))}
                </div>
              )}
              <div className="img-modal-counter">
                {idx + 1} / {entityImages.length}
                {canEdit && (
                  <button
                    className="img-modal-delete"
                    onClick={() => handleDelete(modalImage.id)}
                    title="Delete"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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
          if (w > h) {
            h = Math.round((h * maxSize) / w);
            w = maxSize;
          } else {
            w = Math.round((w * maxSize) / h);
            h = maxSize;
          }
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
