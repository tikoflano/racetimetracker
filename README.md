# RaceTimeTracker

Real-time enduro bike race timing app. One person at the start line triggers a rider's timer, another at the finish line stops it — both see updates instantly via [SpacetimeDB](https://spacetimedb.com).

## Architecture

```
├── client/          React frontend (Vite + TypeScript)
├── spacetimedb/     Server module (SpacetimeDB TypeScript)
├── spacetime.json   SpacetimeDB project config (module, client, database targets)
└── package.json     npm workspace root
```

**Client** — React 19, React Router, SpacetimeDB React SDK, Google OAuth (`@react-oauth/google`). Connects to SpacetimeDB over WebSocket. No traditional REST API.

**Server** — SpacetimeDB v2.0 TypeScript module. Defines tables, reducers, and RBAC logic. Runs inside SpacetimeDB (local standalone or cloud).

## Data Model

| Table | Purpose |
|-------|---------|
| `user` | Authenticated users (identity + Google OAuth claims) |
| `organization` | Org that owns events |
| `org_member` | Org-level roles: `admin`, `manager` |
| `event_member` | Event-level roles: `organizer`, `timekeeper` |
| `championship` | Series grouping events |
| `venue` | Physical location with coordinates |
| `event` | A race event at a venue |
| `track` | A track at a venue |
| `track_variation` | A specific route on a track (with start/end coordinates) |
| `event_track` | Links a track variation to an event (with sort order) |
| `rider` | Rider profile |
| `event_rider` | Links a rider to an event |
| `run` | A single timed run: `queued` → `running` → `finished` / `dnf` |

## Prerequisites

- [SpacetimeDB CLI](https://spacetimedb.com/install) v2.0+
- Node.js 20+

## Setup

```bash
# Install dependencies (npm workspaces)
npm install

# Generate client bindings from the server module
spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path spacetimedb
```

### Local development

Start a local SpacetimeDB instance and run the full dev stack:

```bash
spacetime start &
npm run dev:spacetime
```

This builds the module, publishes to the local server, generates client bindings, and starts the Vite dev server — all with file watching for auto-rebuild.

To seed demo data:

```bash
spacetime call --server local racetimetracker-dev seed_demo_data
```

Set `client/.env` (copy from `client/.env.local.example`):

```
VITE_STDB_ENV=local
VITE_STDB_DATABASE=racetimetracker-dev
```

The Vite proxy forwards `/v1/*` (including WebSocket) to `localhost:3000`.

### Cloud development

The project has two cloud databases on `maincloud.spacetimedb.com`:

| Target | Database name | Usage |
|--------|--------------|-------|
| `dev` | `racetimetracker-dev` | Development/testing |
| `prod` | `racetimetracker-prod` | Production |

Publish to cloud:

```bash
spacetime publish racetimetracker-dev --server maincloud -p spacetimedb
```

Set `client/.env`:

```
VITE_STDB_ENV=cloud
VITE_STDB_CLOUD_HOST=maincloud.spacetimedb.com
VITE_STDB_DATABASE=racetimetracker-dev
```

## Authentication

Google OAuth via `@react-oauth/google`. The ID token is passed to SpacetimeDB via `withToken()`. The `clientConnected` lifecycle reducer validates the JWT against Google's issuer and client ID, then upserts a `user` row.

### RBAC

Permissions are scoped to organizations and events:

- **Org admin** — full access to the org and all its events
- **Org manager** — can manage events within the org
- **Event organizer** — can manage a specific event
- **Event timekeeper** — can start/stop/DNF runs on an event

Anonymous users can view the leaderboard. Timing controls require authentication and an appropriate role.

## Key Reducers

| Reducer | What it does |
|---------|-------------|
| `seed_demo_data` | Creates sample org, venue, tracks, event, riders, and queued runs |
| `start_run` | Sets run status to `running`, records start timestamp |
| `finish_run` | Sets run status to `finished`, records end timestamp |
| `dnf_run` | Marks a run as Did Not Finish |
| `queue_run` | Adds a new run to a track's queue |
| `create_event`, `create_track`, `create_rider`, ... | CRUD reducers with RBAC checks |
