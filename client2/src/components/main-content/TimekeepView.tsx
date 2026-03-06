import { useState, useEffect, useMemo } from "react";
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

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type RunStatus = "queued" | "running" | "finished" | "dnf" | "dns";
type TimekeeperPosition = "start" | "end" | "both";

interface Rider {
  id: bigint;
  firstName: string;
  lastName: string;
}

interface Run {
  id: bigint;
  riderId: bigint;
  eventTrackId: bigint;
  sortOrder: number;
  status: RunStatus;
  startTime: number | null;
  endTime: number | null;
}

interface Event {
  id: bigint;
  name: string;
  slug: string;
}

interface Track {
  id: bigint;
  name: string;
  color: string;
}

interface Assignment {
  id: bigint;
  eventTrackId: bigint;
  position: TimekeeperPosition;
  event: Event;
  track: Track;
  runs: Run[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_RIDERS: Rider[] = [
  { id: 1n, firstName: "Alex", lastName: "Martinez" },
  { id: 2n, firstName: "Jordan", lastName: "Williams" },
  { id: 3n, firstName: "Casey", lastName: "Thompson" },
  { id: 4n, firstName: "Morgan", lastName: "Davis" },
  { id: 5n, firstName: "Taylor", lastName: "Brown" },
  { id: 6n, firstName: "Riley", lastName: "Johnson" },
  { id: 7n, firstName: "Quinn", lastName: "Anderson" },
  { id: 8n, firstName: "Avery", lastName: "Garcia" },
];

const MOCK_EVENTS: Event[] = [
  { id: 1n, name: "Spring Enduro 2026", slug: "spring-enduro-2026" },
  { id: 2n, name: "Mountain Challenge", slug: "mountain-challenge" },
];

const MOCK_TRACKS: Track[] = [
  { id: 1n, name: "Forest Descent", color: "#22c55e" },
  { id: 2n, name: "Rock Garden", color: "#ef4444" },
  { id: 3n, name: "Flow Trail", color: "#3b82f6" },
];

const createInitialRuns = (): Run[] => [
  // Forest Descent - Event 1
  { id: 1n, riderId: 1n, eventTrackId: 1n, sortOrder: 1, status: "running", startTime: Date.now() - 45000, endTime: null },
  { id: 2n, riderId: 2n, eventTrackId: 1n, sortOrder: 2, status: "queued", startTime: null, endTime: null },
  { id: 3n, riderId: 3n, eventTrackId: 1n, sortOrder: 3, status: "queued", startTime: null, endTime: null },
  { id: 4n, riderId: 4n, eventTrackId: 1n, sortOrder: 4, status: "finished", startTime: Date.now() - 120000, endTime: Date.now() - 60000 },
  // Rock Garden - Event 1
  { id: 5n, riderId: 5n, eventTrackId: 2n, sortOrder: 1, status: "queued", startTime: null, endTime: null },
  { id: 6n, riderId: 6n, eventTrackId: 2n, sortOrder: 2, status: "queued", startTime: null, endTime: null },
  // Flow Trail - Event 2
  { id: 7n, riderId: 7n, eventTrackId: 3n, sortOrder: 1, status: "running", startTime: Date.now() - 30000, endTime: null },
  { id: 8n, riderId: 8n, eventTrackId: 3n, sortOrder: 2, status: "queued", startTime: null, endTime: null },
];

const MOCK_ASSIGNMENTS: Omit<Assignment, "runs">[] = [
  { id: 1n, eventTrackId: 1n, position: "both", event: MOCK_EVENTS[0], track: MOCK_TRACKS[0] },
  { id: 2n, eventTrackId: 2n, position: "start", event: MOCK_EVENTS[0], track: MOCK_TRACKS[1] },
  { id: 3n, eventTrackId: 3n, position: "end", event: MOCK_EVENTS[1], track: MOCK_TRACKS[2] },
];

const MOCK_RIDER_NUMBERS: Map<string, number> = new Map([
  ["1-1", 101],
  ["1-2", 102],
  ["1-3", 103],
  ["1-4", 104],
  ["1-5", 201],
  ["1-6", 202],
  ["2-7", 301],
  ["2-8", 302],
]);

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ElapsedTimer Component
// ─────────────────────────────────────────────────────────────────────────────

interface ElapsedTimerProps {
  startTime: number;
  size?: "sm" | "lg";
  dnf?: boolean;
}

function ElapsedTimer({ startTime, size = "sm", dnf }: ElapsedTimerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(interval);
  }, []);

  const elapsed = now - startTime;
  return (
    <Text
      ff="monospace"
      fw={600}
      c={dnf ? "red" : "green"}
      size={size === "lg" ? "2.5rem" : "1.25rem"}
    >
      {formatElapsed(elapsed)}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConnectionIndicator Component
// ─────────────────────────────────────────────────────────────────────────────

interface ConnectionIndicatorProps {
  isConnected: boolean;
}

function ConnectionIndicator({ isConnected }: ConnectionIndicatorProps) {
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

// ─────────────────────────────────────────────────────────────────────────────
// TrackCard Component
// ─────────────────────────────────────────────────────────────────────────────

interface TrackCardProps {
  assignment: Assignment;
  riderMap: Map<bigint, Rider>;
  getRiderNumber: (eventId: bigint, riderId: bigint) => number | undefined;
  onStart: (runId: bigint) => void;
  onStop: (runId: bigint) => void;
  onDnf: (runId: bigint) => void;
  onDns: (runId: bigint) => void;
}

function TrackCard({
  assignment,
  riderMap,
  getRiderNumber,
  onStart,
  onStop,
  onDnf,
  onDns,
}: TrackCardProps) {
  const { event, track, runs, position } = assignment;

  const canStart = position === "start" || position === "both";
  const canStop = position === "end" || position === "both";

  const queuedRuns = runs.filter((r) => r.status === "queued");
  const runningRuns = runs.filter((r) => r.status === "running");
  const nextQueued = queuedRuns.length > 0 ? queuedRuns[0] : null;

  const finishedCount = runs.filter((r) => r.status === "finished").length;
  const dnsCount = runs.filter((r) => r.status === "dns").length;
  const dnfCount = runs.filter((r) => r.status === "dnf").length;

  const positionLabel =
    position === "both" ? "Start & End" : position === "start" ? "Start" : "Finish";
  const positionBadgeColor =
    position === "both" ? "blue" : position === "start" ? "green" : "yellow";

  return (
    <Paper withBorder p="md" radius="md" style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Group justify="space-between" align="flex-start" mb="sm">
        <Box style={{ minWidth: 0 }}>
          <Group gap="xs" mb={4}>
            <Box
              style={{
                width: 12,
                height: 12,
                borderRadius: 4,
                backgroundColor: track.color,
              }}
            />
            <Text fw={600} size="md">
              {track.name}
            </Text>
          </Group>
          <Text size="sm" c="dimmed">
            {event.name}
          </Text>
        </Box>
        <Badge color={positionBadgeColor} variant="light" size="sm">
          {positionLabel}
        </Badge>
      </Group>

      {/* Running riders */}
      {runningRuns.map((run) => {
        const rider = riderMap.get(run.riderId);
        const num = getRiderNumber(event.id, run.riderId);
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
            <Group justify="space-between" align="center" mb="xs">
              <Group gap="sm">
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
            </Group>
            <ElapsedTimer startTime={run.startTime!} size="lg" />
            {canStop ? (
              <Group gap="xs" mt="sm">
                <Button
                  color="red"
                  size="md"
                  style={{ flex: 1 }}
                  leftSection={<IconPlayerStop size={18} />}
                  onClick={() => onStop(run.id)}
                >
                  STOP
                </Button>
                <Button
                  color="orange"
                  variant="filled"
                  size="sm"
                  leftSection={<IconX size={16} />}
                  onClick={() => onDnf(run.id)}
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

      {/* Next queued */}
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
              #{getRiderNumber(event.id, nextQueued.riderId) ?? "?"}
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
              onClick={() => onStart(nextQueued.id)}
            >
              START
            </Button>
            <Button
              color="orange"
              variant="filled"
              size="sm"
              leftSection={<IconBan size={16} />}
              onClick={() => onDns(nextQueued.id)}
            >
              DNS
            </Button>
          </Group>
        </Box>
      )}

      {/* Empty state */}
      {queuedRuns.length === 0 && runningRuns.length === 0 && (
        <Box py="lg" style={{ textAlign: "center" }}>
          <IconClock size={32} color="var(--mantine-color-dimmed)" />
          <Text size="sm" c="dimmed" mt="xs">
            No riders in queue
          </Text>
        </Box>
      )}

      {/* Summary */}
      <Text
        size="xs"
        c="dimmed"
        mt="auto"
        pt="sm"
        style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
      >
        {queuedRuns.length} queued · {runningRuns.length} racing · {finishedCount} finished · {dnfCount} DNF · {dnsCount} DNS
      </Text>
    </Paper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TimekeepView Component
// ─────────────────────────────────────────────────────────────────────────────

export function TimekeepView() {
  const [isConnected] = useState(true);
  const [isSynced] = useState(true);
  const [runs, setRuns] = useState<Run[]>(createInitialRuns);

  const riderMap = useMemo(() => {
    const m = new Map<bigint, Rider>();
    for (const r of MOCK_RIDERS) m.set(r.id, r);
    return m;
  }, []);

  const assignments: Assignment[] = useMemo(() => {
    return MOCK_ASSIGNMENTS.map((a) => ({
      ...a,
      runs: runs
        .filter((r) => r.eventTrackId === a.eventTrackId)
        .sort((x, y) => x.sortOrder - y.sortOrder),
    }));
  }, [runs]);

  const getRiderNumber = (eventId: bigint, riderId: bigint) =>
    MOCK_RIDER_NUMBERS.get(`${eventId}-${riderId}`);

  const handleStart = (runId: bigint) => {
    setRuns((prev) =>
      prev.map((r) =>
        r.id === runId ? { ...r, status: "running" as RunStatus, startTime: Date.now() } : r
      )
    );
  };

  const handleStop = (runId: bigint) => {
    setRuns((prev) =>
      prev.map((r) =>
        r.id === runId ? { ...r, status: "finished" as RunStatus, endTime: Date.now() } : r
      )
    );
  };

  const handleDnf = (runId: bigint) => {
    setRuns((prev) =>
      prev.map((r) =>
        r.id === runId ? { ...r, status: "dnf" as RunStatus, endTime: Date.now() } : r
      )
    );
  };

  const handleDns = (runId: bigint) => {
    setRuns((prev) =>
      prev.map((r) => (r.id === runId ? { ...r, status: "dns" as RunStatus } : r))
    );
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" wrap="wrap">
        <Title order={2} fw={700}>
          Timekeeping
        </Title>
        <Group gap="sm">
          <ConnectionIndicator isConnected={isConnected} />
          {isConnected && isSynced && (
            <Badge size="sm" variant="light" color="blue" leftSection={<IconClock size={12} />}>
              Synced
            </Badge>
          )}
        </Group>
      </Group>

      {assignments.length === 0 ? (
        <Paper withBorder p="xl" radius="md" style={{ textAlign: "center" }}>
          <IconClock size={48} color="var(--mantine-color-dimmed)" />
          <Text c="dimmed" mt="md">
            No track assignments yet.
          </Text>
          <Text size="sm" c="dimmed">
            Ask an event organizer to assign you to a track.
          </Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {assignments.map((assignment) => (
            <TrackCard
              key={String(assignment.id)}
              assignment={assignment}
              riderMap={riderMap}
              getRiderNumber={getRiderNumber}
              onStart={handleStart}
              onStop={handleStop}
              onDnf={handleDnf}
              onDns={handleDns}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
