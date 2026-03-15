import { useState } from 'react';
import { Badge, Box, Button, Group, Text } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import classes from './EventPreviewView.module.css';
import { ViewHeader } from '@/components/common';

interface EventInfo {
  name: string;
  roundLabel: string;
  championshipName: string;
  locationName: string;
  dateRange: string;
  status: 'LIVE' | 'UPCOMING' | 'COMPLETED';
  totalRiders: number;
  totalStages: number;
  totalDistanceKm: number;
  prizePool: string;
  description: string;
  highlights: string[];
}

interface RiderRow {
  plate: number;
  name: string;
  category: string;
  bike: string;
  status: 'On course' | 'In pits' | 'Finished' | 'DNS' | 'DNF';
  gap: string;
}

interface StageInfo {
  name: string;
  description: string;
  distanceKm: number;
  status: 'COMPLETED' | 'LIVE' | 'UP NEXT';
  startTime: string;
}

interface LiveTimingRow {
  position: number;
  rider: string;
  plate: number;
  stageTime: string;
  diff: string;
}

interface ResultRow {
  position: number;
  rider: string;
  plate: number;
  totalTime: string;
  stageWins: number;
  points: number;
}

interface PodiumEntry {
  place: 1 | 2 | 3;
  rider: string;
  totalTime: string;
  points: number;
}

const mockEvent: {
  info: EventInfo;
  riders: RiderRow[];
  stages: StageInfo[];
  liveTiming: LiveTimingRow[];
  results: {
    podium: PodiumEntry[];
    rows: ResultRow[];
  };
} = {
  info: {
    name: '2024 National Enduro Championship',
    roundLabel: 'Round 5 · Mount Blackwood',
    championshipName: 'Australian National Enduro Series',
    locationName: 'Mount Blackwood, VIC',
    dateRange: 'Sat 18 Aug – Sun 19 Aug',
    status: 'LIVE',
    totalRiders: 156,
    totalStages: 6,
    totalDistanceKm: 180,
    prizePool: '$50,000',
    description:
      'Two days of world‑class enduro racing through alpine singletrack, fire road climbs, and high‑speed ridge descents.',
    highlights: [
      'Mass start prologue under lights on Saturday night',
      '6 special stages across two days with live timing',
      'UCI points on offer for Elite Men & Women',
      'Dedicated junior and e‑MTB categories',
    ],
  },
  riders: [
    {
      plate: 3,
      name: 'Monica Chen',
      category: 'Elite Women',
      bike: 'Trek Slash 9.9',
      status: 'On course',
      gap: 'Leader',
    },
    {
      plate: 21,
      name: 'Jack McAllister',
      category: 'Elite Men',
      bike: 'Specialized Enduro S‑Works',
      status: 'On course',
      gap: '+3.4s',
    },
    {
      plate: 11,
      name: 'Ty Rinaldi',
      category: 'Elite Men',
      bike: 'Santa Cruz Nomad CC',
      status: 'In pits',
      gap: '+8.2s',
    },
    {
      plate: 54,
      name: 'Sienna Park',
      category: 'U19 Women',
      bike: 'Yeti SB140',
      status: 'On course',
      gap: '+12.9s',
    },
    {
      plate: 78,
      name: 'Luca Moreno',
      category: 'U17 Men',
      bike: 'Canyon Spectral',
      status: 'Finished',
      gap: '+18.4s',
    },
  ],
  stages: [
    {
      name: 'Stage 1 · Forest Sprint',
      description: 'Tight pine forest singletrack with a punchy mid‑race climb.',
      distanceKm: 4.2,
      status: 'COMPLETED',
      startTime: '9:15 AM',
    },
    {
      name: 'Stage 2 · Ridge Line',
      description: 'Exposed ridge with high‑speed rock gardens and big views.',
      distanceKm: 6.1,
      status: 'COMPLETED',
      startTime: '10:05 AM',
    },
    {
      name: 'Stage 3 · Creek Run',
      description: 'Flow trail with multiple creek crossings and slippery roots.',
      distanceKm: 5.4,
      status: 'LIVE',
      startTime: '11:30 AM',
    },
    {
      name: 'Stage 4 · Rock Garden',
      description: 'Technical boulder fields with off‑camber chutes.',
      distanceKm: 3.8,
      status: 'UP NEXT',
      startTime: '1:45 PM',
    },
  ],
  liveTiming: [
    { position: 1, rider: 'Monica Chen', plate: 3, stageTime: '03:24.512', diff: '—' },
    { position: 2, rider: 'Jack McAllister', plate: 21, stageTime: '03:27.921', diff: '+3.409' },
    { position: 3, rider: 'Ty Rinaldi', plate: 11, stageTime: '03:32.701', diff: '+8.189' },
    { position: 4, rider: 'Sienna Park', plate: 54, stageTime: '03:36.812', diff: '+12.300' },
    { position: 5, rider: 'Luca Moreno', plate: 78, stageTime: '03:42.003', diff: '+17.491' },
  ],
  results: {
    podium: [
      { place: 1, rider: 'Monica Chen', totalTime: '21:12.486', points: 250 },
      { place: 2, rider: 'Jack McAllister', totalTime: '21:18.944', points: 200 },
      { place: 3, rider: 'Ty Rinaldi', totalTime: '21:23.091', points: 170 },
    ],
    rows: [
      {
        position: 1,
        rider: 'Monica Chen',
        plate: 3,
        totalTime: '21:12.486',
        stageWins: 3,
        points: 250,
      },
      {
        position: 2,
        rider: 'Jack McAllister',
        plate: 21,
        totalTime: '21:18.944',
        stageWins: 2,
        points: 200,
      },
      {
        position: 3,
        rider: 'Ty Rinaldi',
        plate: 11,
        totalTime: '21:23.091',
        stageWins: 1,
        points: 170,
      },
      {
        position: 4,
        rider: 'Sienna Park',
        plate: 54,
        totalTime: '21:42.331',
        stageWins: 0,
        points: 140,
      },
      {
        position: 5,
        rider: 'Luca Moreno',
        plate: 78,
        totalTime: '21:58.772',
        stageWins: 0,
        points: 120,
      },
    ],
  },
};

const riderFilters = ['All riders', 'Elite', 'Junior', 'e‑MTB'] as const;
type RiderFilter = (typeof riderFilters)[number];

export function EventPreviewView() {
  const { info, riders, stages, liveTiming, results } = mockEvent;
  const [activeFilter, setActiveFilter] = useState<RiderFilter>('All riders');

  const filteredRiders =
    activeFilter === 'All riders'
      ? riders
      : riders.filter((rider) =>
          activeFilter === 'Elite'
            ? rider.category.toLowerCase().includes('elite')
            : activeFilter === 'Junior'
              ? rider.category.toLowerCase().includes('u1')
              : rider.category.toLowerCase().includes('e-mtb')
        );

  return (
    <div className={classes.eventPage}>
      <Box mb="xl">
        <ViewHeader
          icon={<Text fw={700}>EV</Text>}
          iconColor="green"
          eyebrow={info.championshipName}
          title={info.name}
          subtitle={`${info.roundLabel} · ${info.locationName} · ${info.dateRange}`}
          actions={
            <Group gap="xs" align="flex-end">
              <Badge color="green" radius="sm">
                {info.status}
              </Badge>
              <Text size="xs" c="dimmed">
                Stage 3 · Creek Run · LIVE
              </Text>
            </Group>
          }
        />
      </Box>

      <section className={classes.overviewGrid}>
        <div className={classes.card}>
          <div className={classes.cardHeaderRow}>
            <h2 className={classes.sectionTitle}>Overview</h2>
            <Badge color="blue" variant="light">
              Enduro
            </Badge>
          </div>
          <p className={classes.eventDescription}>{info.description}</p>
          <ul className={classes.highlightsList}>
            {info.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className={classes.metricsColumn}>
          <div className={classes.metricCard}>
            <span className={classes.metricLabel}>Total riders</span>
            <span className={classes.metricValue}>{info.totalRiders}</span>
          </div>
          <div className={classes.metricRow}>
            <div className={classes.metricCard}>
              <span className={classes.metricLabel}>Total stages</span>
              <span className={classes.metricValue}>{info.totalStages}</span>
            </div>
            <div className={classes.metricCard}>
              <span className={classes.metricLabel}>Race distance</span>
              <span className={classes.metricValue}>{info.totalDistanceKm} km</span>
            </div>
          </div>
          <div className={classes.metricCard}>
            <span className={classes.metricLabel}>Prize pool</span>
            <span className={classes.metricValue}>{info.prizePool}</span>
          </div>
        </div>
      </section>

      <section className={classes.section}>
        <div className={classes.sectionHeader}>
          <div>
            <h2 className={classes.sectionTitle}>Riders</h2>
            <p className={classes.sectionSubtitle}>
              {filteredRiders.length} of {info.totalRiders} riders shown
            </p>
          </div>
          <div className={classes.filtersRow}>
            {riderFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`${classes.pillFilter} ${
                  activeFilter === filter ? classes.pillFilterActive : ''
                }`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className={classes.card}>
          <DataTable<RiderRow>
            withTableBorder={false}
            withColumnBorders={false}
            highlightOnHover
            className={classes.table}
            records={filteredRiders}
            columns={[
              {
                accessor: 'plate',
                title: '#',
                width: 70,
                render: (rider) => <span className={classes.monoCell}>{rider.plate}</span>,
              },
              { accessor: 'name', title: 'Rider' },
              { accessor: 'category', title: 'Category' },
              { accessor: 'bike', title: 'Bike' },
              {
                accessor: 'status',
                title: 'Status',
                render: (rider) => (
                  <Badge
                    size="sm"
                    color={
                      rider.status === 'On course'
                        ? 'green'
                        : rider.status === 'In pits'
                          ? 'yellow'
                          : rider.status === 'Finished'
                            ? 'blue'
                            : 'red'
                    }
                    variant="light"
                  >
                    {rider.status}
                  </Badge>
                ),
              },
              {
                accessor: 'gap',
                title: 'Gap',
                textAlign: 'right',
                render: (rider) => (
                  <span className={`${classes.alignRight} ${classes.monoCell}`}>{rider.gap}</span>
                ),
              },
            ]}
          />
        </div>
      </section>

      <section className={classes.section}>
        <div className={classes.sectionHeader}>
          <h2 className={classes.sectionTitle}>Stages</h2>
        </div>
        <div className={classes.stagesList}>
          {stages.map((stage) => (
            <div key={stage.name} className={classes.stageCard}>
              <div>
                <div className={classes.stageTitleRow}>
                  <h3 className={classes.stageTitle}>{stage.name}</h3>
                  <Badge
                    size="sm"
                    color={
                      stage.status === 'LIVE'
                        ? 'green'
                        : stage.status === 'UP NEXT'
                          ? 'yellow'
                          : 'blue'
                    }
                    variant={stage.status === 'LIVE' ? 'filled' : 'light'}
                  >
                    {stage.status}
                  </Badge>
                </div>
                <p className={classes.stageDescription}>{stage.description}</p>
              </div>
              <div className={classes.stageMeta}>
                <span>{stage.distanceKm.toFixed(1)} km</span>
                <span className={classes.metaSeparator}>•</span>
                <span>Start {stage.startTime}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={classes.section}>
        <div className={classes.sectionHeader}>
          <h2 className={classes.sectionTitle}>Live timing</h2>
        </div>
        <div className={classes.liveTimingGrid}>
          <div className={classes.card}>
            <div className={classes.cardHeaderRow}>
              <h3 className={classes.cardTitle}>Stage 3 · Live leaderboard</h3>
              <Badge size="sm" color="green" variant="light">
                Updated every 0.05s
              </Badge>
            </div>
            <DataTable<LiveTimingRow>
              withTableBorder={false}
              withColumnBorders={false}
              highlightOnHover
              className={classes.table}
              records={liveTiming}
              columns={[
                {
                  accessor: 'position',
                  title: 'Pos',
                  width: 70,
                  render: (row) => <span className={classes.monoCell}>{row.position}</span>,
                },
                { accessor: 'rider', title: 'Rider' },
                {
                  accessor: 'plate',
                  title: '#',
                  width: 80,
                  render: (row) => <span className={classes.monoCell}>{row.plate}</span>,
                },
                {
                  accessor: 'stageTime',
                  title: 'Stage time',
                  render: (row) => <span className={classes.monoCell}>{row.stageTime}</span>,
                },
                {
                  accessor: 'diff',
                  title: 'Diff',
                  textAlign: 'right',
                  render: (row) => (
                    <span className={`${classes.alignRight} ${classes.monoCell}`}>{row.diff}</span>
                  ),
                },
              ]}
            />
          </div>

          <div className={classes.card}>
            <h3 className={classes.cardTitle}>Next stage</h3>
            <Group justify="space-between" mb="sm">
              <div>
                <Text className={classes.nextStageLabel}>Stage 4 · Rock Garden</Text>
                <Text className={classes.nextStageTime}>Start 1:45 PM · In 27 min</Text>
              </div>
              <Badge color="yellow" variant="light">
                UP NEXT
              </Badge>
            </Group>
            <div className={classes.nextStageMeta}>
              <div>
                <span className={classes.metricLabel}>Current time</span>
                <span className={classes.metricValue}>1:18 PM</span>
              </div>
              <div>
                <span className={classes.metricLabel}>Weather</span>
                <span className={classes.metricValue}>14°C · Partly cloudy</span>
              </div>
            </div>
            <Button fullWidth mt="md" color="green" radius="md" size="md">
              Start Stage 4
            </Button>
            <Text size="xs" mt="xs" className={classes.helperText}>
              Controls are mocked for now · no actions are sent to the timer.
            </Text>
          </div>
        </div>
      </section>

      <section className={classes.section}>
        <div className={classes.sectionHeader}>
          <h2 className={classes.sectionTitle}>Results</h2>
        </div>

        <div className={classes.podiumGrid}>
          {results.podium.map((entry) => (
            <div
              key={entry.place}
              className={`${classes.podiumCard} ${classes[`podium${entry.place}`]}`}
            >
              <span className={classes.podiumPlaceLabel}>
                {entry.place === 1 ? '1st' : entry.place === 2 ? '2nd' : '3rd'}
              </span>
              <span className={classes.podiumRider}>{entry.rider}</span>
              <span className={classes.podiumTime}>{entry.totalTime}</span>
              <Badge size="sm" color={entry.place === 1 ? 'yellow' : 'blue'} variant="light">
                {entry.points} pts
              </Badge>
            </div>
          ))}
        </div>

        <div className={classes.card}>
          <DataTable<ResultRow>
            withTableBorder={false}
            withColumnBorders={false}
            highlightOnHover
            className={classes.table}
            records={results.rows}
            columns={[
              {
                accessor: 'position',
                title: 'Pos',
                width: 70,
                render: (row) => <span className={classes.monoCell}>{row.position}</span>,
              },
              { accessor: 'rider', title: 'Rider' },
              {
                accessor: 'plate',
                title: '#',
                width: 80,
                render: (row) => <span className={classes.monoCell}>{row.plate}</span>,
              },
              {
                accessor: 'totalTime',
                title: 'Total time',
                render: (row) => <span className={classes.monoCell}>{row.totalTime}</span>,
              },
              {
                accessor: 'stageWins',
                title: 'Stage wins',
                render: (row) => <span className={classes.monoCell}>{row.stageWins}</span>,
              },
              {
                accessor: 'points',
                title: 'Points',
                textAlign: 'right',
                render: (row) => (
                  <span className={`${classes.alignRight} ${classes.monoCell}`}>{row.points}</span>
                ),
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
