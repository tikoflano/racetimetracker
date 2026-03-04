# AGENTS.md

Conventions and context for AI agents working on this codebase.

## Project Overview

RaceTimeTracker — real-time enduro bike race timing. SpacetimeDB handles all backend logic (no REST API, no separate server process). The client connects over WebSocket and receives live updates via subscriptions.

## Tech Stack

- **Server:** SpacetimeDB v2.0 TypeScript module (`spacetimedb/src/index.ts`)
- **Client:** React 19 + Vite + TypeScript (`client/`)
- **Auth:** Google OAuth ID tokens validated server-side in `clientConnected`
- **SDK:** `spacetimedb` npm package (both server and client)

## SpacetimeDB

See SpacetimeDB docs in Cursor docs for server and client patterns.

## Auth & RBAC

- Google OAuth Client ID is in `client/.env`.
- Permission hierarchy: super_admin > org admin > org manager > event organizer > event timekeeper.
- Permission helpers in `client/src/auth.tsx`: `canManageOrg()`, `canManageOrgEvents()`, `canOrganizeEvent()`, `canTimekeep()`.
- Anonymous users can view the public leaderboard display at `/event/:slug/leaderboard` or `/:orgSlug/event/:slug/leaderboard`. The event view requires auth. Track timing controls require auth + role.

### Restricted pages and `useActiveOrg`

Views that require an active organization (championships, riders, members, locations, etc.) must **not** use `useActiveOrg()` when they also redirect unauthenticated users. `useActiveOrg()` throws "No active organization" when `activeOrgId` is null — and for unauthenticated users, `activeOrgId` is typically null because `userOrgs` is empty. The throw happens before the auth redirect can run.

**Use `useActiveOrgMaybe()` instead** in any view that redirects unauthenticated users to `/`. Pattern:

1. Use `useActiveOrgMaybe()` (returns `bigint | null`) instead of `useActiveOrg()` (throws when null).
2. Early returns in this order: `!isReady` → `!isAuthenticated` (redirect to `/`) → `!oid` (return null).
3. Guard derived values: `org = oid ? orgs.find(...) : null`, `hasAccess = oid !== null ? canManageOrgEvents(oid) : false`.
4. In `useMemo` hooks that filter by `oid`, return early when `!oid` (e.g. `if (!oid) return []`).

Reference: `ChampionshipsView.tsx`, `RidersView.tsx`, `OrgMembersView.tsx`, `LocationsView.tsx`, `ChampionshipDetailView.tsx`, `LocationDetailView.tsx`.

## Terminology

- Always use **"rider"** (not "racer") when referring to participants. If a request uses "racer", replace it with "rider" and let the requester know.
- Always use **"location"** (not "venue") when referring to the places where events happen. If a request uses "venue", replace it with "location" and let the requester know. Note: SpacetimeDB table/column names and generated bindings still use `venue` (schema rename would require migration), but file names, routes, CSS classes, component names, and local variables use "location".

## Code Conventions

- TypeScript strict mode in both client and server.
- ESLint + Prettier for linting and formatting. Run `npm run lint` and `npm run format` before committing.
- No CSS modules — all styles in `client/src/index.css`.
- No component library — plain HTML elements with CSS classes.
- `bigint` for all SpacetimeDB IDs (auto-increment u64).
- `formatElapsed(ms)` in `utils.ts` for time display.
- `getErrorMessage(e, fallback)` in `utils.ts` for extracting user-facing messages from caught errors.
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
