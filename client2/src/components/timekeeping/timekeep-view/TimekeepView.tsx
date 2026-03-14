import { useState, useEffect, useMemo, useRef } from "react";
import {
  Badge,
  Box,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconWifi,
  IconWifiOff,
  IconClock,
  IconPlayerPlay,
  IconPlayerStop,
  IconX,
  IconBan,
} from "@tabler/icons-react";
import { useTable, useReducer, useSpacetimeDB } from "spacetimedb/react";
import { tables, reducers } from "@/module_bindings";
import { useAuth } from "@/auth";
import type {
  TimekeeperAssignment,
  EventTrack,
  Event,
  TrackVariation,
  Track,
  Run,
  Rider,
  EventRider,
  EventCategory,
  ServerTimeResponse,
} from "@/module_bindings/types";

function formatElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

interface ElapsedTimerProps {
  startTimeMs: number;
  clockOffset: number;
}

function ElapsedTimer({ startTimeMs, clockOffset }: ElapsedTimerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  const elapsed = now + clockOffset - startTimeMs;
  return (
    <Text ff="monospace" fw={700} c="green" size="2rem">
      {formatElapsed(elapsed)}
    </Text>
  );
}

function ConnectionIndicator({ isConnected }: { isConnected: boolean }) {
  return (
    <Badge
      size="sm"
      variant="light"
      color={isConnected ? "green" : "red"}
      leftSection={isConnected ? <IconWifi size={12} /> : <IconWifiOff size={12} />}
    >
      {isConnected ? "Connected" : "Disconnected"}
    </Badge>
  );
}

export function TimekeepView() {
  const connState = useSpacetimeDB();
  const isConnected = connState.isActive;
  const { user, isAuthenticated } = useAuth();

  const [clockOffset, setClockOffset] = useState(0);
  const [clockSynced, setClockSynced] = useState(false);
  const clockRequestId = useRef(BigInt(Date.now()));

  const getServerTime = useReducer(reducers.getServerTime);
  const startRun = useReducer(reducers.startRun);
  const finishRun = useReducer(reducers.finishRun);
  const dnfRun = useReducer(reducers.dnfRun);
  const dnsRun = useReducer(reducers.dnsRun);

  const [serverTimeResponses] = useTable(tables.server_time_response);
  const [assignments] = useTable(tables.timekeeper_assignment);
  const [eventTracks] = useTable(tables.event_track);
  const [events] = useTable(tables.event);
  const [trackVariations] = useTable(tables.track_variation);
  const [tracksData] = useTable(tables.track);
  const [runs] = useTable(tables.run);
  const [riders] = useTable(tables.rider);
  const [eventRiders] = useTable(tables.event_rider);
  const [eventCategories] = useTable(tables.event_category);

  useEffect(() => {
    if (isConnected) {
      getServerTime({ requestId: clockRequestId.current });
    }
  }, [isConnected, getServerTime]);

  useEffect(() => {
    if (clockSynced) return;
    const response = serverTimeResponses.find(
      (r: ServerTimeResponse) => r.requestId === clockRequestId.current,
    );
    if (response) {
      setClockOffset(Number(response.serverTime) - Date.now());
      setClockSynced(true);
    }
  }, [serverTimeResponses, clockSynced]);

  const riderMap = useMemo(() => {
    const m = new Map<bigint, Rider>();
    for (const r of riders) m.set((r as Rider).id, r as Rider);
    return m;
  }, [riders]);

  const riderNumberMap = useMemo(() => {
    const m = new Map<string, number>();
    const catStartMap = new Map<bigint, number>();
    for (const c of eventCategories) {
      catStartMap.set((c as EventCategory).id, (c as EventCategory).numberRangeStart);
    }
    for (const er of eventRiders) {
      const e = er as EventRider;
      const num =
        e.assignedNumber !== 0
          ? e.assignedNumber
          : e.categoryId !== 0n
            ? (catStartMap.get(e.categoryId) ?? 0)
            : 0;
      if (num) m.set(`${e.eventId}-${e.riderId}`, num);
    }
    return m;
  }, [eventRiders, eventCategories]);

  const myAssignments = useMemo(() => {
    if (!user) return [];
    return assignments
      .filter((a: TimekeeperAssignment) => a.userId === user.id)
      .map((a: TimekeeperAssignment) => {
        const et = eventTracks.find((et: EventTrack) => et.id === a.eventTrackId);
        const event = et ? events.find((e: Event) => e.id === et.eventId) : undefined;
        const tv = et
          ? trackVariations.find((v: TrackVariation) => v.id === et.trackVariationId)
          : undefined;
        const track = tv ? tracksData.find((t: Track) => t.id === tv.trackId) : undefined;
        const trackRuns = et
          ? [...runs]
              .filter((r: Run) => r.eventTrackId === et.id)
              .sort((a: Run, b: Run) => a.sortOrder - b.sortOrder)
          : [];
        return { assignment: a, eventTrack: et, event, track, trackRuns };
      })
      .filter((a) => a.eventTrack && a.event);
  }, [user, assignments, eventTracks, events, trackVariations, tracksData, runs]);

  const getCorrectedTime = () => BigInt(Date.now() + clockOffset);

  const getRiderNumber = (eventId: bigint, riderId: bigint) =>
    riderNumberMap.get(`${eventId}-${riderId}`);

  if (!isAuthenticated || !user) {
    return (
      <Paper withBorder p="xl" ta="center" radius="md">
        <IconClock size={48} color="var(--mantine-color-dimmed)" />
        <Text c="dimmed" mt="md">
          Please log in to access timekeeping.
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" wrap="wrap">
        <Title order={2} fw={700}>
          Timekeeping
        </Title>
        <Group gap="sm">
          <ConnectionIndicator isConnected={isConnected} />
          {isConnected && clockSynced && (
            <Badge size="sm" variant="light" color="blue" leftSection={<IconClock size={12} />}>
              Synced
            </Badge>
          )}
        </Group>
      </Group>

      {myAssignments.length === 0 && (
        <Paper withBorder p="xl" radius="md" style={{ textAlign: "center" }}>
          <IconClock size={48} color="var(--mantine-color-dimmed)" />
          <Text c="dimmed" mt="md">
            No track assignments yet.
          </Text>
          <Text size="sm" c="dimmed">
            Ask an event organizer to assign you to a track.
          </Text>
        </Paper>
      )}

      {myAssignments.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {myAssignments.map(({ assignment, event, track, trackRuns }) => {
            const canStart = assignment.position === "start" || assignment.position === "both";
            const canStop = assignment.position === "end" || assignment.position === "both";

            const queuedRuns = trackRuns.filter((r: Run) => r.status === "queued");
            const runningRuns = trackRuns.filter((r: Run) => r.status === "running");
            const nextQueued = queuedRuns.length > 0 ? queuedRuns[0] : null;

            const finishedCount = trackRuns.filter((r: Run) => r.status === "finished").length;
            const dnsCount = trackRuns.filter((r: Run) => r.status === "dns").length;
            const dnfCount = trackRuns.filter((r: Run) => r.status === "dnf").length;

            const positionLabel =
              assignment.position === "both"
                ? "Start & End"
                : assignment.position === "start"
                  ? "Start"
                  : "Finish";
            const positionBadgeColor =
              assignment.position === "both"
                ? "blue"
                : assignment.position === "start"
                  ? "green"
                  : "yellow";

            return (
              <Paper
                key={String(assignment.id)}
                withBorder
                p="md"
                radius="md"
                style={{ display: "flex", flexDirection: "column" }}
              >
                <Group justify="space-between" align="flex-start" mb="sm">
                  <Box style={{ minWidth: 0 }}>
                    <Group gap="xs" mb={4}>
                      {track?.color && (
                        <Box
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 4,
                            backgroundColor: track.color,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Text fw={600} size="md" truncate>
                        {track?.name ?? "Track"}
                      </Text>
                    </Group>
                    <Text size="sm" c="dimmed" truncate>
                      {event!.name}
                    </Text>
                  </Box>
                  <Badge color={positionBadgeColor} variant="light" size="sm">
                    {positionLabel}
                  </Badge>
                </Group>

                {runningRuns.map((run: Run) => {
                  const rider = riderMap.get(run.riderId);
                  const num = getRiderNumber(event!.id, run.riderId);
                  return (
                    <Box
                      key={String(run.id)}
                      p="sm"
                      mb="sm"
                      style={{
                        borderRadius: "var(--mantine-radius-md)",
                        background: "var(--mantine-color-red-light)",
                        border: "1px solid var(--mantine-color-red-3)",
                      }}
                    >
                      <Group gap="sm" mb="xs">
                        <Text fw={700} size="xl" c="red">
                          #{num ?? "?"}
                        </Text>
                        <Box>
                          <Text size="sm" fw={500}>
                            {rider ? `${rider.firstName} ${rider.lastName}` : "Unknown"}
                          </Text>
                          <Badge color="red" variant="filled" size="xs">
                            Racing
                          </Badge>
                        </Box>
                      </Group>
                      <ElapsedTimer
                        startTimeMs={Number(run.startTime)}
                        clockOffset={clockOffset}
                      />
                      {canStop ? (
                        <Group gap="xs" mt="sm">
                          <Button
                            color="red"
                            size="md"
                            style={{ flex: 1 }}
                            leftSection={<IconPlayerStop size={18} />}
                            onClick={() =>
                              finishRun({ runId: run.id, clientTime: getCorrectedTime() })
                            }
                          >
                            STOP
                          </Button>
                          <Button
                            color="orange"
                            variant="filled"
                            size="sm"
                            leftSection={<IconX size={16} />}
                            onClick={() => dnfRun({ runId: run.id })}
                          >
                            DNF
                          </Button>
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed" mt="sm">
                          Waiting for finish line...
                        </Text>
                      )}
                    </Box>
                  );
                })}

                {canStart && nextQueued && (
                  <Box
                    p="sm"
                    mb="sm"
                    style={{
                      borderRadius: "var(--mantine-radius-md)",
                      background: "var(--mantine-color-green-light)",
                      border: "1px solid var(--mantine-color-green-3)",
                    }}
                  >
                    <Group gap="sm" mb="sm">
                      <Text fw={700} size="xl" c="green">
                        #{getRiderNumber(event!.id, nextQueued.riderId) ?? "?"}
                      </Text>
                      <Box>
                        <Text size="sm" fw={500}>
                          {(() => {
                            const r = riderMap.get(nextQueued.riderId);
                            return r ? `${r.firstName} ${r.lastName}` : "Unknown";
                          })()}
                        </Text>
                        <Text size="xs" c="dimmed">
                          #{nextQueued.sortOrder} in queue
                        </Text>
                      </Box>
                    </Group>
                    <Group gap="xs">
                      <Button
                        color="green"
                        size="md"
                        style={{ flex: 1 }}
                        leftSection={<IconPlayerPlay size={18} />}
                        onClick={() =>
                          startRun({ runId: nextQueued.id, clientTime: getCorrectedTime() })
                        }
                      >
                        START
                      </Button>
                      <Button
                        color="yellow"
                        variant="filled"
                        size="sm"
                        leftSection={<IconBan size={16} />}
                        onClick={() => dnsRun({ runId: nextQueued.id })}
                      >
                        DNS
                      </Button>
                    </Group>
                  </Box>
                )}

                {queuedRuns.length === 0 && runningRuns.length === 0 && (
                  <Box py="lg" style={{ textAlign: "center" }}>
                    <IconClock size={32} color="var(--mantine-color-dimmed)" />
                    <Text size="sm" c="dimmed" mt="xs">
                      No riders in queue
                    </Text>
                  </Box>
                )}

                <Text
                  size="xs"
                  c="dimmed"
                  mt="auto"
                  pt="sm"
                  style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
                >
                  {queuedRuns.length} queued · {runningRuns.length} racing · {finishedCount}{" "}
                  finished · {dnfCount} DNF · {dnsCount} DNS
                </Text>
              </Paper>
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );
}


