import { useState, useMemo, useEffect } from 'react';
import { Group, Modal, Button, Text, Box } from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { Image as ImageType } from '../module_bindings/types';

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
      .filter((img: ImageType) => img.entityType === entityType && img.entityId === entityId)
      .sort((a: ImageType, b: ImageType) => a.sortOrder - b.sortOrder);
  }, [images, entityType, entityId]);

  useEffect(() => {
    if (modalIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalIndex(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [modalIndex]);

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

  const idx = modalIndex !== null ? Math.min(modalIndex, entityImages.length - 1) : 0;
  const modalImage = entityImages[idx];

  if (entityImages.length === 0 && !canEdit) return null;

  return (
    <>
      <Group gap="xs" wrap="wrap" mb="xs">
        {entityImages.map((img: ImageType, i: number) => (
          <Box
            key={String(img.id)}
            style={{
              width: 72,
              height: 72,
              borderRadius: 'var(--mantine-radius-sm)',
              overflow: 'hidden',
              border: '1px solid var(--mantine-color-default-border)',
              cursor: 'pointer',
            }}
            onClick={() => setModalIndex(i)}
          >
            <img
              src={img.data}
              alt={img.caption || 'Image'}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </Box>
        ))}
        {canEdit && (
          <label
            style={{
              width: 72,
              height: 72,
              borderRadius: 'var(--mantine-radius-sm)',
              border: '1px solid var(--mantine-color-default-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'var(--mantine-color-default)',
              color: 'var(--mantine-color-dimmed)',
              fontSize: '1.4rem',
            }}
          >
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
          <Text size="sm" c="dimmed">
            No images
          </Text>
        )}
      </Group>

      <Modal
        opened={modalIndex !== null}
        onClose={() => setModalIndex(null)}
        withCloseButton
        size="lg"
        padding={0}
      >
        {modalImage && (
          <>
            <Carousel
              initialSlide={idx}
              withIndicators={entityImages.length > 1}
              withControls={entityImages.length > 1}
              onSlideChange={setModalIndex}
              height="70vh"
            >
              {entityImages.map((img: ImageType) => (
                <Carousel.Slide key={String(img.id)}>
                  <img
                    src={img.data}
                    alt={img.caption || 'Image'}
                    style={{
                      width: '100%',
                      height: '70vh',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </Carousel.Slide>
              ))}
            </Carousel>
            <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
              {modalImage.caption && (
                <Text size="sm" c="dimmed" ta="center" mb="xs">
                  {modalImage.caption}
                </Text>
              )}
              <Group justify="center" gap="md">
                <Text size="xs" c="dimmed">
                  {idx + 1} / {entityImages.length}
                </Text>
                {canEdit && (
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() => handleDelete(modalImage.id)}
                  >
                    Delete
                  </Button>
                )}
              </Group>
            </Box>
          </>
        )}
      </Modal>
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
