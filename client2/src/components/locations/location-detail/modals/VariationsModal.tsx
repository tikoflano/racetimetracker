import type { UseEmblaCarouselType } from 'embla-carousel-react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import {
  IconChevronLeft,
  IconChevronRight,
  IconDotsVertical,
  IconPencil,
  IconPlus,
  IconRoute,
  IconTrash,
} from '@tabler/icons-react';
import type { Track, TrackVariation } from '../types';
import { VariationMapPreview } from '../VariationMapPreview';
import { ModalHeader, modalHeaderStyles } from '@/components/common';

interface VariationsModalProps {
  opened: boolean;
  onClose: () => void;
  track: Track;
  variations: TrackVariation[];
  currentSlide: number;
  onSlideChange: (index: number) => void;
  carouselEmblaRef: React.MutableRefObject<UseEmblaCarouselType[1] | null>;
  onEditVariation: (tv: TrackVariation) => void;
  onDeleteVariation: (tv: TrackVariation) => void;
  onAddVariationFromModal: (trackId: bigint) => void;
}

export function VariationsModal({
  opened,
  onClose,
  track,
  variations: vars,
  currentSlide,
  onSlideChange,
  carouselEmblaRef,
  onEditVariation,
  onDeleteVariation,
  onAddVariationFromModal,
}: VariationsModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm" align="center">
          <Box
            w={12}
            h={12}
            style={{ borderRadius: '50%', background: track.color }}
          />
          <ModalHeader
            icon={<IconRoute size={20} />}
            iconColor="blue"
            label="Track"
            title={`${track.name} — Variations`}
          />
        </Group>
      }
      centered
      radius="md"
      size="lg"
      overlayProps={{ blur: 3 }}
      styles={modalHeaderStyles()}
    >
      {vars.length === 0 ? (
        <Paper withBorder p="xl">
          <Stack align="center" gap="md">
            <Text c="dimmed" ta="center">
              No variations yet.
            </Text>
            <Button variant="light" onClick={onClose}>
              Close
            </Button>
          </Stack>
        </Paper>
      ) : (
        <>
          <Group wrap="nowrap" align="center" gap="sm" style={{ alignItems: 'stretch' }}>
            {vars.length > 1 && (
              <ActionIcon
                variant="filled"
                size="lg"
                color="dark"
                aria-label="Previous variation"
                onClick={() => carouselEmblaRef.current?.scrollPrev()}
                style={{
                  background: 'var(--mantine-color-dark-6)',
                  border: 'none',
                  color: 'white',
                  alignSelf: 'center',
                }}
              >
                <IconChevronLeft size={24} />
              </ActionIcon>
            )}
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Carousel
                getEmblaApi={(api) => {
                  carouselEmblaRef.current = api;
                }}
                initialSlide={currentSlide}
                onSlideChange={onSlideChange}
                withIndicators={vars.length > 1}
                withControls={false}
                height={420}
                loop
                styles={{
                  control: {
                    background: 'var(--mantine-color-dark-6)',
                    border: 'none',
                    color: 'white',
                  },
                }}
              >
                {vars.map((tv) => (
                  <Carousel.Slide key={String(tv.id)}>
                    <Paper radius="md" p="md" style={{ height: 380 }}>
                      <Stack gap="md" h="100%">
                        <Group justify="space-between" align="flex-start">
                          <Group gap="xs">
                            {tv.name === 'Default' ? (
                              <Badge size="xs" variant="light" color="blue">
                                Default
                              </Badge>
                            ) : (
                              <Text fw={600} size="sm">
                                {tv.name}
                              </Text>
                            )}
                          </Group>
                          <Group gap="xs">
                            {tv.name !== 'Default' && vars.length > 1 && (
                              <Button
                                variant="subtle"
                                size="xs"
                                color="red"
                                leftSection={<IconTrash size={14} />}
                                onClick={() => onDeleteVariation(tv)}
                              >
                                Delete
                              </Button>
                            )}
                            <Menu shadow="md" width={150} position="bottom-end">
                              <Menu.Target>
                                <ActionIcon variant="subtle" size="sm" color="gray">
                                  <IconDotsVertical size={14} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  leftSection={<IconPencil size={14} />}
                                  onClick={() => onEditVariation(tv)}
                                >
                                  Edit
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<IconPlus size={14} />}
                                  onClick={() => onAddVariationFromModal(track.id)}
                                >
                                  Add variation
                                </Menu.Item>
                                {tv.name !== 'Default' && vars.length > 1 && (
                                  <Menu.Item
                                    leftSection={<IconTrash size={14} />}
                                    color="red"
                                    onClick={() => onDeleteVariation(tv)}
                                  >
                                    Delete
                                  </Menu.Item>
                                )}
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Group>
                        <Text size="sm" c="dimmed" lineClamp={2}>
                          {tv.description || '—'}
                        </Text>
                        <Box
                          style={{
                            flex: 1,
                            minHeight: 0,
                            borderRadius: 'var(--mantine-radius-sm)',
                            overflow: 'hidden',
                          }}
                        >
                          <VariationMapPreview
                            variation={tv}
                            trackColor={track.color}
                            height={280}
                          />
                        </Box>
                      </Stack>
                    </Paper>
                  </Carousel.Slide>
                ))}
              </Carousel>
            </Box>
            {vars.length > 1 && (
              <ActionIcon
                variant="filled"
                size="lg"
                color="dark"
                aria-label="Next variation"
                onClick={() => carouselEmblaRef.current?.scrollNext()}
                style={{
                  background: 'var(--mantine-color-dark-6)',
                  border: 'none',
                  color: 'white',
                  alignSelf: 'center',
                }}
              >
                <IconChevronRight size={24} />
              </ActionIcon>
            )}
          </Group>
          {vars[currentSlide] && (
            <Box p="xs" style={{ borderTop: '1px solid var(--mantine-color-dark-5)' }}>
              <Text size="xs" c="dimmed" ta="center">
                {currentSlide + 1} / {vars.length}
              </Text>
            </Box>
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={onClose}>
              Close
            </Button>
          </Group>
        </>
      )}
    </Modal>
  );
}
