# AGENTS.md

Conventions and context for AI agents working on this codebase.

## Project Overview

RaceTimeTracker — real-time enduro bike race timing. SpacetimeDB handles all backend logic (no REST API, no separate server process). The client connects over WebSocket and receives live updates via subscriptions.

## Tech Stack

- **Server:** SpacetimeDB v2.0 TypeScript module (`spacetimedb/src/index.ts`)
- **Client:** React 19 + Vite + TypeScript + Mantine UI (`client/`) — `@mantine/core`, `@mantine/hooks`, `@mantine/dates`, `@mantine/carousel`, `@mantine/form`
- **Auth:** Google OAuth ID tokens validated server-side in `clientConnected`
- **SDK:** `spacetimedb` npm package (both server and client)

## Mantine UI

- **Favor native Mantine components over custom implementations** when a suitable component exists (e.g. Carousel, Calendar, Modal, Menu). Prefer `@mantine/carousel`, `@mantine/dates`, etc. over hand-rolled alternatives.
- Use Mantine components for all UI primitives: Modal, Menu, Select, TextInput, Button, Table, Badge, Alert, Skeleton, Tabs, Paper, Calendar, DatePickerInput, DateTimePickerInput, Carousel, etc.
- Icons: Continue using FontAwesome via `client/src/icons.ts`. Pass as `leftSection` or `rightSection` where Mantine components accept them.
- Theming: Dark mode by default (`defaultColorScheme="dark"`). Custom theme in `client/src/theme.ts`.
- Layout: Use `AppShell` for app structure (Header, Navbar/sidebar, Main). Use `Stack`, `Group`, `Box`, `Flex` for content layout.
- For forms: Prefer `@mantine/form` with `useForm` when doing multi-field forms with validation.
- Action menus: Use `Menu` with `Menu.Target` (e.g. `ActionIcon` with ellipsis) and `Menu.Dropdown` / `Menu.Item`. Destructive actions use `color="red"`.
- Modals: Use Mantine `Modal` with `opened`, `onClose`, `title`. Close on Escape and overlay click by default. In the main client (non-SpacetimeDB shell), use the shared `Modal` wrapper at `client/src/components/Modal.tsx`. In the experimental `client2` shell, follow the **New Location** modal as the visual reference for:
  - **Header**: rich header aligned with the page banner.
    - Use a gradient or themed background matching the page (e.g. `linear-gradient(135deg, #1C2348 0%, #2A3364 60%, #313B72 100%)` for blue pages, or a green variant for org/members).
    - Compose `title` as a `Group` with a `ThemeIcon` on the left and a text block on the right:
      - Top line: small, uppercase `Text` label (e.g. `"Add venue"`, `"Create championship"`) with subtle color.
      - Second line: main title `Text` (`fw={700}`, `size="lg"`) such as `"New Location"`, `"New Championship"`, `"Add Event"`, `"Invite Member"`.
    - Use the `styles` prop on `Modal` to style the header and close button, e.g.:
      - `styles={{ header: { background: <gradient>, borderBottom: "<1px solid ...>" }, close: { color: "white" } }}` (tune colors per page).
  - **Body**: Wrap modal content in a `Stack` (typically `gap="md"` with `pt="xs"`). Show validation or API errors as a red `Text size="sm"` at the top of the body.
  - **Footer buttons**: Place actions in a `Group` with `justify="flex-end"` at the bottom of the body.
    - Order: secondary `Button` with `variant="subtle"` (e.g. **Cancel**, **Close**) on the left, primary action button on the right (e.g. **Create Location**, **Create**, **Save**, **Invite**).
    - Use concise, action-focused labels. For edit/update flows (e.g. “Edit roles & scopes”, “Rename organization”, “Edit Championship”), prefer **Save** as the primary button label (not “Done”) and give it a solid background (default button variant) to clearly indicate it commits changes.
  - **Size & shape**: Prefer `radius="md"` and `size="lg"` (or larger when needed), with `centered` and a light blurred overlay (`overlayProps={{ blur: 3 }}`) for primary workflows.
- Error display: Use `Alert` with `color="red"`, `withCloseButton`, `onClose`.
- **Selects:** Favor searchable dropdowns (`Select` with `searchable` or Combobox) when the list is expected to have more than 10 items (riders, events, locations, championships, categories, etc.). Plain `Select` is fine for small fixed lists (e.g. status, role).

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

### Active org (client2)

In the experimental **client2** shell, active organization is owned by the Org provider (`client2/src/providers/OrgProvider.tsx`). Views must use `useActiveOrgMaybe()` or `useActiveOrg()` (and optionally `useActiveOrgFromOrgs(orgs)` to resolve the active org from the orgs list). Do **not** read the active-org storage key from `localStorage` in components.

## Terminology

- Always use **"rider"** (not "racer") when referring to participants. If a request uses "racer", replace it with "rider" and let the requester know.
- Always use **"location"** (not "venue") when referring to the places where events happen. If a request uses "venue", replace it with "location" and let the requester know. Note: SpacetimeDB table/column names and generated bindings still use `venue` (schema rename would require migration), but file names, routes, CSS classes, component names, and local variables use "location".

## Code Conventions

- TypeScript strict mode in both client and server.
- ESLint + Prettier for linting and formatting. Run `npm run lint` and `npm run format` before committing.
- Mantine UI for components. Minimal custom CSS in `index.css` for app-specific layout and domain styles.
- `bigint` for all SpacetimeDB IDs (auto-increment u64).
- `formatElapsed(ms)` in `utils.ts` for time display.
- `getErrorMessage(e, fallback)` in `utils.ts` for extracting user-facing messages from caught errors.
- `ElapsedTimer` component for live-updating timers (polls every 50ms).

### Icons

All icons use FontAwesome via `client/src/icons.ts`. Import from `../icons` — never use emojis or HTML entities for icons.

### Action menus

Entity-level actions (rename, share, manage, delete, etc.) go in a **dropdown menu** triggered by a vertical dots icon (`faEllipsisVertical`). Use Mantine `Menu` with `Menu.Target` (e.g. `ActionIcon` with ellipsis) and `Menu.Dropdown` / `Menu.Item`. Destructive actions use `color="red"`. See `ActionMenu` and `RowActionMenu` in `client/src/components/ActionMenu.tsx` and `EventActionMenu` in `EventView.tsx` as reference implementations.

### Error messages

Show error messages in a **dismissable banner** using the `ErrorBanner` component (`client/src/components/ErrorBanner.tsx`), which wraps Mantine `Alert` with `color="red"`, `withCloseButton`, `onClose`. Props: `message`, `onDismiss`, `noMargin` (optional, for use inside modals). See `OrgMembersView.tsx` for usage.

### Modals

Use the `Modal` component (`client/src/components/Modal.tsx`), which wraps Mantine `Modal`, for forms and dialogs that require user input or confirmation. Props: `open`, `onClose`, `title`, `children`. Close on Escape and overlay click by default. See the invite member flow in `OrgMembersView.tsx` as the reference implementation.

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

## UI testing

- **Ad-hoc browser tests:** Use the ui-test-playwright skill when the user asks to test a specific behavior in a real browser. Always implement the scenario in a spec file under `e2e/scratch/` (name the file as appropriate, e.g. `scratch.spec.ts` or a descriptive name). Run `npm run test:e2e:scratch` from the repo root, and report pass/fail.
