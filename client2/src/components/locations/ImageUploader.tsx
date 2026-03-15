import { useState, useCallback, useRef } from 'react';
import { ActionIcon, Box, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconPhoto, IconStar, IconStarFilled, IconUpload, IconX } from '@tabler/icons-react';

export function resizeImage(file: File, maxPx = 900): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = url;
  });
}

interface ImageUploaderProps {
  images: string[];
  coverIndex: number | null;
  onAdd: (dataUrls: string[]) => void;
  onRemove: (index: number) => void;
  onSetCover: (index: number) => void;
}

export function ImageUploader({
  images,
  coverIndex,
  onAdd,
  onRemove,
  onSetCover,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      const dataUrls = await Promise.all(
        Array.from(files)
          .filter((f) => f.type.startsWith('image/'))
          .map((f) => resizeImage(f))
      );
      if (dataUrls.length > 0) onAdd(dataUrls);
    },
    [onAdd]
  );

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        Images
      </Text>

      {images.length > 0 && (
        <SimpleGrid cols={4} spacing="xs">
          {images.map((src, i) => (
            <Box
              key={i}
              style={{ position: 'relative', aspectRatio: '4/3', cursor: 'pointer' }}
              onClick={() => onSetCover(i)}
            >
              <Box
                component="img"
                src={src}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 'var(--mantine-radius-sm)',
                  border:
                    i === coverIndex
                      ? '2px solid var(--mantine-color-blue-5)'
                      : '2px solid var(--mantine-color-dark-4)',
                  display: 'block',
                }}
              />
              <Box style={{ position: 'absolute', top: 4, left: 4 }}>
                {i === coverIndex ? (
                  <IconStarFilled
                    size={14}
                    style={{
                      color: 'var(--mantine-color-yellow-4)',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                    }}
                  />
                ) : (
                  <IconStar
                    size={14}
                    style={{ color: 'white', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
                  />
                )}
              </Box>
              <ActionIcon
                size="xs"
                color="red"
                variant="filled"
                style={{ position: 'absolute', top: 4, right: 4 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
              >
                <IconX size={10} />
              </ActionIcon>
            </Box>
          ))}
        </SimpleGrid>
      )}

      <Box
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        style={{
          border: `2px dashed ${dragging ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-dark-4)'}`,
          borderRadius: 'var(--mantine-radius-sm)',
          padding: '16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(66,99,235,0.08)' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        <Group justify="center" gap="xs">
          {images.length === 0 ? (
            <IconPhoto size={16} style={{ opacity: 0.4 }} />
          ) : (
            <IconUpload size={16} style={{ opacity: 0.4 }} />
          )}
          <Text size="sm" c="dimmed">
            {images.length === 0 ? 'Drag images here or click to upload' : 'Add more images'}
          </Text>
        </Group>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </Box>
      {images.length > 0 && (
        <Text size="xs" c="dimmed">
          Click a photo to set it as the cover. Star = current cover.
        </Text>
      )}
    </Stack>
  );
}
