# AGENTS.md

Conventions and context for AI agents working on this codebase.

## Project Overview

RaceTimeTracker — real-time enduro bike race timing. SpacetimeDB handles all backend logic (no REST API, no separate server process). The client connects over WebSocket and receives live updates via subscriptions.

## Tech Stack

- **Server:** SpacetimeDB v2.0 TypeScript module (`spacetimedb/src/index.ts`)
- **Client:** React 19 + Vite + TypeScript (`client/`)
- **Auth:** Google OAuth ID tokens validated server-side in `clientConnected`
- **SDK:** `spacetimedb` npm package (both server and client)

## Project Structure

```
├── client/                      React frontend
│   ├── src/
│   │   ├── main.tsx             Entry point, SpacetimeDB connection setup
│   │   ├── App.tsx              Root component, routing
│   │   ├── auth.tsx             AuthProvider context, RBAC permission helpers
│   │   ├── views/               Page-level components (EventView, TrackView)
│   │   ├── components/          Reusable components (ElapsedTimer, LoginButton, Skeleton)
│   │   ├── module_bindings/     Auto-generated (DO NOT EDIT) — run spacetime generate
│   │   ├── utils.ts             Shared utilities (formatElapsed)
│   │   └── index.css            All styles (single file, no CSS modules)
│   ├── .env                     Runtime config (VITE_STDB_ENV, VITE_STDB_DATABASE, etc.)
│   └── vite.config.ts           Dev server config, Vite proxy for local SpacetimeDB
├── spacetimedb/                 Server module
│   └── src/index.ts             All tables, reducers, RBAC logic (single file)
├── spacetime.json               SpacetimeDB project config with database targets
└── package.json                 npm workspace root
```

## SpacetimeDB Patterns

### Server module (`spacetimedb/src/index.ts`)

- All tables and reducers are defined in a single `schema({...})` call.
- Table IDs use `t.u64().primaryKey().autoInc()` — never generate IDs manually.
- Column names in table definitions use `snake_case`. The SDK auto-generates camelCase accessors for the client.
- `ctx.db.<table>` uses the schema key directly (e.g., `ctx.db.event`, `ctx.db.run`).
- Reducers access the caller via `ctx.sender` (identity) or `ctx.senderAuth.jwt` (JWT claims).
- `SenderError` is thrown for permission/validation failures — the SDK surfaces these to the client.
- The `clientConnected` lifecycle reducer handles user upsert from Google JWT claims.
- `Math.random()` is NOT available in the SpacetimeDB runtime.

### Client SDK (`spacetimedb/react`)

- `SpacetimeDBProvider` wraps the app with `connectionBuilder` prop (not `connect`).
- `useSpacetimeDB()` returns `ConnectionState` with `isActive`, `identity`, `getConnection()`.
- `useTable(tables.xxx)` returns `[rows, isReady]`. Each call creates its own per-table subscription internally.
- `useReducer(reducers.xxx)` returns a callable function.
- **Do NOT use `subscribeToAllTables()` with `useTable`** — the SDK docs explicitly warn against mixing them on the same connection.
- The `isReady` flag from `useTable` only becomes `true` when that specific subscription's `onApplied` fires. Do not gate UI rendering on `isReady` across many tables — it causes persistent skeleton screens.
- Table accessor names in `connection.db` match the schema keys (e.g., `connection.db.event`).
- Generated bindings are in `client/src/module_bindings/` — regenerate with `spacetime generate`.

### Connection config

The client reads env vars to determine where to connect:

| Variable | Values | Effect |
|----------|--------|--------|
| `VITE_STDB_ENV` | `cloud` / `local` | `cloud`: connect to `wss://<CLOUD_HOST>`. `local`: connect through Vite proxy to `localhost:3000` |
| `VITE_STDB_CLOUD_HOST` | hostname | Default: `maincloud.spacetimedb.com` |
| `VITE_STDB_DATABASE` | database name | e.g., `racetimetracker-dev` |

For local dev, the Vite proxy in `vite.config.ts` forwards `/v1/*` (HTTP + WebSocket) to `localhost:3000`.

## Database Targets

`spacetime.json` defaults to the local server with database `racetimetracker-dev`. Cloud publish uses `--no-config` with explicit server flags.

| Target | Server | Database | Command |
|--------|--------|----------|---------|
| local (dev) | `localhost:3000` | `racetimetracker-dev` | `npm run dev:spacetime` |
| cloud (dev) | `maincloud.spacetimedb.com` | `racetimetracker-dev` | `npm run publish` |
| cloud (prod) | `maincloud.spacetimedb.com` | `racetimetracker-prod` | `npm run publish` (change db name) |

## Auth & RBAC

- Google OAuth Client ID is in `client/.env` and hardcoded in `spacetimedb/src/index.ts` for server-side validation.
- Permission hierarchy: super_admin > org admin > org manager > event organizer > event timekeeper.
- Permission helpers in `client/src/auth.tsx`: `canManageOrg()`, `canManageOrgEvents()`, `canOrganizeEvent()`, `canTimekeep()`.
- Anonymous users see the leaderboard. Track timing controls require auth + role.

## Code Conventions

- TypeScript strict mode in both client and server.
- No CSS modules — all styles in `client/src/index.css`.
- No component library — plain HTML elements with CSS classes.
- `bigint` for all SpacetimeDB IDs (auto-increment u64).
- `formatElapsed(ms)` in `utils.ts` for time display.
- `ElapsedTimer` component for live-updating timers (polls every 50ms).

## Common Tasks

**Important:** When you make schema changes or other changes that require publishing, run the publish command yourself. Do not instruct the user to run it — execute it as part of your workflow.

### Local development with `spacetime dev`

Start the full stack (SpacetimeDB server must be running on port 3000):

```bash
spacetime start &          # Start local server (if not already running)
npm run dev:spacetime      # Build + publish + generate bindings + start Vite
```

`spacetime dev` watches for file changes and auto-rebuilds/republishes/regenerates.

### Regenerate client bindings manually

```bash
spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path spacetimedb
```

### Publish module to cloud (dev)

```bash
npm run publish
```

### Seed demo data (local)

```bash
spacetime call --server local racetimetracker-dev seed_demo_data
```

### Query local database

```bash
spacetime sql --server local racetimetracker-dev "SELECT * FROM event"
```

## Cursor Cloud specific instructions

### Environment

- SpacetimeDB CLI is installed at `~/.local/bin/spacetime`. Ensure `PATH` includes `~/.local/bin`.
- Node.js 22+ and npm are pre-installed.
- `npm install` at the workspace root installs both `client/` and `spacetimedb/` via npm workspaces.

### Running locally

1. Start the SpacetimeDB standalone server: `spacetime start --listen-addr 0.0.0.0:3000 &`
2. Run `npm run dev:spacetime` — this handles build, publish, binding generation, and Vite startup.
3. The Vite client runs on port 5173 and proxies WebSocket/HTTP to SpacetimeDB on port 3000.
4. Seed data with: `spacetime call --server local racetimetracker-dev seed_demo_data`

### Gotchas

- `spacetime dev` does **not** auto-start the local server. You must run `spacetime start` first.
- The `dev:spacetime` script uses `--no-config` because SpacetimeDB CLI v2.0.1 doesn't support the nested `databases` config format in `spacetime.json`. All flags are passed explicitly.
- `client/src/module_bindings/` is gitignored and auto-generated. Never edit manually; `spacetime dev` regenerates on each run.
- Reducer names are `snake_case` in CLI/SQL but `camelCase` in TypeScript code.
- The `client/.env` file (gitignored) must exist with `VITE_STDB_ENV=local` and `VITE_STDB_DATABASE=racetimetracker-dev`. Copy from `client/.env.local.example`.
- Google OAuth "Sign in" won't work on `localhost` without valid OAuth credentials configured for the origin. The app still functions without auth for read-only views.
