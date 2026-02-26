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
- Anonymous users can view the public leaderboard display at `/event/:slug/leaderboard` or `/:orgSlug/event/:slug/leaderboard`. The event view requires auth. Track timing controls require auth + role.

## Terminology

- Always use **"rider"** (not "racer") when referring to participants. If a request uses "racer", replace it with "rider" and let the requester know.
- Always use **"location"** (not "venue") when referring to the places where events happen. If a request uses "venue", replace it with "location" and let the requester know. Note: SpacetimeDB table/column names and generated bindings still use `venue` (schema rename would require migration), but file names, routes, CSS classes, component names, and local variables use "location".

## Code Conventions

- TypeScript strict mode in both client and server.
- No CSS modules — all styles in `client/src/index.css`.
- No component library — plain HTML elements with CSS classes.
- `bigint` for all SpacetimeDB IDs (auto-increment u64).
- `formatElapsed(ms)` in `utils.ts` for time display.
- `ElapsedTimer` component for live-updating timers (polls every 50ms).

### Icons

All icons use FontAwesome via `client/src/icons.ts`. Import from `../icons` — never use emojis or HTML entities for icons.

### Action menus

Entity-level actions (rename, share, manage, delete, etc.) go in a **dropdown menu** triggered by a vertical dots icon (`faEllipsisVertical`). This is the standard pattern used across the app (events, organizations, member rows).

Implementation pattern:
- The title row containing the entity name and the trigger button must use `alignItems: 'baseline'` to align the icon with the text.
- Trigger button: `<FontAwesomeIcon icon={faEllipsisVertical} />` in a `ghost small` button
- Dropdown: absolutely positioned `div` with `background: var(--surface)`, border, shadow, `zIndex: 50`
- Each item: flex row with `justifyContent: 'flex-start'`, fixed-width icon span (16px), then label text
- Destructive actions (delete, leave): `color: 'var(--red, #ef4444)'`
- Close on outside click via `useRef` + `useEffect` mousedown listener
- When one action is used very frequently, keep it as a visible button outside the dropdown (e.g. "Manage Event" in EventView). Secondary actions stay in the dropdown.
- See `EventActionMenu` in `EventView.tsx` as the reference implementation.

### Error messages

Show error messages in a **dismissable banner** using the `ErrorBanner` component (`client/src/components/ErrorBanner.tsx`).

Implementation pattern:
- Import: `import ErrorBanner from '../components/ErrorBanner';`
- Props: `message` (string), `onDismiss` (callback), `noMargin` (optional, for use inside modals)
- Place the banner near the relevant context (e.g. below a section header, inside a modal)
- Call `onDismiss` to clear the error state when the user clicks the X button
- See `OrgMembersView.tsx` for usage (page-level and inside invite modal).

### Modals

Use the `Modal` component (`client/src/components/Modal.tsx`) for forms and dialogs that require user input or confirmation. Prefer modals over inline forms for add/edit flows (invite member, create entity, etc.).

Implementation pattern:
- Import: `import Modal from '../components/Modal';`
- Props: `open`, `onClose`, `title`, `children`
- Close on Escape key and overlay click (handled by Modal)
- On success, call `onClose()` (or your close handler) to dismiss
- Show validation/error messages inside the modal body when the action fails
- See the invite member flow in `OrgMembersView.tsx` as the reference implementation.

### Table pagination

Use pagination for tables that expect over 10 entries. This reduces DOM nodes and improves performance.

Implementation pattern:
- **State:** `page` (0-based), `pageSize` (default 10, persisted in localStorage)
- **Options:** `PAGE_SIZE_OPTIONS = [10, 20, 50, 100]`
- **localStorage key:** `racetimetracker-<entity>-page-size` (e.g. `racetimetracker-riders-page-size`)
- **Initial pageSize:** Read from localStorage on mount; validate against options; fallback to 10
- **Persist on change:** When user changes the per-page select, call `localStorage.setItem(key, String(n))`
- **Derived:** `totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))`, `paginatedRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize)`
- **Reset page:** `useEffect` that calls `setPage(0)` when filters (search, age, etc.) or `pageSize` change
- **UI:** Previous/Next buttons, "Page X of Y (N items)" text, per-page `<select>` with label "Per page", all in a flex row with `justifyContent: 'flex-end'` (aligned right below the table)
- **Visibility:** Show pagination controls only when `filteredRows.length > PAGE_SIZE_OPTIONS[0]` (i.e. more than the smallest option)
- **Disabled states:** Previous disabled when `page === 0`, Next disabled when `page >= totalPages - 1`
- See `RidersView.tsx` as the reference implementation.

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
