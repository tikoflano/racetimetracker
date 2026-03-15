# client2 Migration Tracker

Tracks remaining work to migrate all features from `client/` to `client2/`.

**Legend:** ✅ Done · 🔧 UI built, needs backend · ⬜ Not started

---

## Views

### ✅ Members (`/members`)

Fully implemented with live SpaceTimeDB backend.

---

### 🔧 Calendar (`/calendar`)

UI is complete. Needs backend wiring.

- [ ] Replace mock data with live `event` + `championship` table subscriptions
- [ ] Championship filter driven by real rows (colors, names)
- [ ] Click event pill → navigate to event detail
- [ ] "Last Event" / "Next Event" jump buttons work with real dates

---

### 🔧 Locations (`/locations`)

UI is complete (cards, search, sort, filter, create modal with map/geocoding). Needs backend wiring.

- [ ] Subscribe to `venue` and `track` tables (drop `MOCK_VENUES`, `MOCK_TRACKS`)
- [ ] Wire "Create venue" modal to `createVenue` reducer
- [ ] Wire "Delete venue" to `deleteVenue` reducer
- [ ] Track count from real `track` rows grouped by `venueId`
- [ ] Image upload wired to `addImage` reducer (`entityType: "venue"`, base64 JPEG)
- [ ] Auth guard: `canManageOrgEvents`
- [ ] Fix URL routing: detail view should use `/locations/:id` URL param (currently state-based)

---

### 🔧 Location Detail (`/locations/:id`)

UI is mostly complete (venue header, image carousel, track list, variation table, map). Needs backend wiring and a few missing UI features.

**Backend (all currently local state):**

- [ ] Subscribe to `venue`, `track`, `track_variation`, `image` tables
- [ ] Venue edit → `updateVenue` reducer
- [ ] Venue delete → `deleteVenue` reducer, navigate back
- [ ] Track create/edit/delete → `createTrack`, `updateTrack`, `deleteTrack`
- [ ] Variation create/edit/delete → `createTrackVariation`, `updateTrackVariation`, `deleteTrackVariation`
- [ ] Image upload → `addImage` reducer; delete → `deleteImage`
- [ ] Auth guard: `canManageOrgEvents`

**UI gaps vs. old client:**

- [ ] Map: click on map to place START/END pin (currently manual lat/lng text input only)
- [ ] Map: drag marker to reposition pin
- [ ] Error handling on reducer calls (show notifications on failure)
- [ ] Fix URL: should be routed via `/locations/:id`, not internal state in `LocationsRouter`

---

### ⬜ Riders (`/riders`)

Not started.

- [ ] Header banner with rider count
- [ ] DataTable: first name, last name, email, phone, DOB, calculated age
- [ ] Add rider modal (first name\*, last name\*, email, phone, DOB) → `createRider`
- [ ] Edit rider modal → `updateRider`
- [ ] Delete rider confirm dialog → `deleteRider`
- [ ] Real-time search by name or email
- [ ] Age range filter (min/max inputs)
- [ ] Configurable page size (10/20/50/100), persisted to `localStorage`
- [ ] Registration section:
  - [ ] Toggle registration on/off → `setRegistrationEnabled`
  - [ ] Display registration URL (`/register/:orgSlug`)
  - [ ] QR code modal for the registration link
- [ ] Auth guard: `canManageOrgEvents`
- [ ] Add `/riders` route to `AppSidebar` and `MainContent`

---

### ⬜ Championships (`/championships`)

Not started.

- [ ] Header banner with championship count
- [ ] DataTable: color dot, name, status badge, event count, next event (with date), start/end dates
- [ ] Computed status: "Not Started" / "In Progress" / "Completed" (based on event dates vs. today)
- [ ] Status filter pills with counts (All / In Progress / Not Started / Completed)
- [ ] Column sorting (name, status, events, next event, start, end), direction persisted to `localStorage`
- [ ] Click championship name → navigate to championship detail
- [ ] Click next event name → navigate to event detail
- [ ] Create championship modal (name\*, description, color picker) → `createChampionship`
- [ ] Delete championship confirm dialog (cascades to all events) → `deleteChampionship`
- [ ] Auth guard: `canManageOrgEvents`
- [ ] Add `/championships` route to `AppSidebar` and `MainContent`

---

### ⬜ Event Detail (`/events/:id`)

Not started.

- [ ] Event header: name (inline edit → `updateEvent`), description, venue, start/end dates
- [ ] Pin/unpin toggle → `togglePinEvent` (reads `pinned_event` table)
- [ ] Generate + copy public leaderboard URL
- [ ] Leaderboard table per category:
  - [ ] Columns: position, rider number, name, runs completed, total time
  - [ ] DNF / DNS status badges
  - [ ] Expandable row → per-track run breakdown with individual times
- [ ] "Manage Event" button (auth-gated: `canOrganizeEvent`)
- [ ] Add `/events/:id` route to `MainContent`

---

### ⬜ Event Manage (`/events/:id/manage`)

Not started. This is the most complex view in the app.

**Event metadata:**

- [ ] Edit name, dates, description, venue

**Riders tab:**

- [ ] Table of registered riders (category, check-in status, assigned number)
- [ ] Add rider to event → `addRiderToEvent`
- [ ] Update rider registration (category, number, check-in) → `updateEventRider`
- [ ] Import riders from another event → `importRidersFromEvent`

**Categories tab:**

- [ ] Create/edit/delete categories → `createEventCategory`, `updateEventCategory`, `deleteEventCategory`
- [ ] Set number ranges (start/end) per category
- [ ] Import categories from another event → `importCategoriesFromEvent`
- [ ] Link/unlink categories to tracks → `addTrackToCategory`, `removeTrackFromCategory`

**Tracks tab:**

- [ ] Add tracks from venue → `addTrackToEvent`
- [ ] Remove tracks → `removeTrackFromEvent`
- [ ] Reorder tracks (sort order)
- [ ] Assign timekeepers per position (start/finish/both) → `setTrackTimekeepers`
- [ ] Generate or clear timed schedule → `generateTrackSchedule`, `clearTrackSchedule`

**Run queue:**

- [ ] Queue riders for a track → `queueRun`
- [ ] View queued/running/finished/DNF/DNS per track

- [ ] Auth guard: `canOrganizeEvent`
- [ ] Add `/events/:id/manage` route to `MainContent`

---

### ⬜ Events List (`/events`)

Not started. (No direct equivalent in old client — it used the Calendar as the entry point.)

- [ ] List or calendar-entry point to events within the active org/championship
- [ ] Add `/events` route to `AppSidebar` and `MainContent`

---

### ⬜ Timekeep (`/timekeep`)

Not started. Requires real-time clock sync.

- [ ] Grid of track assignments for logged-in user (`timekeeper_assignment` filtered by `userId`)
- [ ] Per-assignment card:
  - [ ] Event name + link, track name
  - [ ] Position badge: Start / Finish / Start & End
  - [ ] Currently running rider with live elapsed timer
  - [ ] Next queued rider
  - [ ] Run summary counts (queued / running / finished / DNF / DNS)
- [ ] START button → `startRun`
- [ ] STOP button → `finishRun`
- [ ] DNF button → `dnfRun`
- [ ] DNS button (start position only) → `dnsRun`
- [ ] `useClockSync` hook: call `getServerTime`, read `server_time_response`, compute offset
- [ ] Live elapsed timer ticking every second using synced clock
- [ ] Connection status indicator
- [ ] Auth: requires authenticated user

---

### ⬜ Track Display (`/track/:eventTrackId`)

Not started. Read-only big-screen display.

- [ ] Track name and variation shown prominently
- [ ] Currently running rider(s) with large live elapsed timer
- [ ] Next rider in queue
- [ ] Remaining queue (collapsed, expand if long)
- [ ] Finished runs sorted fastest-first
- [ ] DNF and DNS sections
- [ ] Run summary counts
- [ ] `useClockSync` integration
- [ ] Connection status indicator
- [ ] Add `/track/:eventTrackId` route to `MainContent` (no sidebar/header needed)

---

### ⬜ Leaderboard (`/leaderboard/:eventId`)

Not started. Public-facing big-screen display.

- [ ] Full-screen dark-themed layout (no sidebar/header)
- [ ] Large event name header
- [ ] Category selector with dot indicators
- [ ] Auto-scrolling leaderboard table:
  - [ ] Columns: position, rider number, name, runs completed, total time
  - [ ] Finished sorted by time → incomplete → DNF
  - [ ] Scroll progress bar at top
- [ ] Auto-scroll behavior: 3s pause at top → 80px/s scroll → 2s pause at bottom → next category → repeat
- [ ] Manual scroll pauses auto-scroll (resumes after 3s inactivity)
- [ ] Auto-cycles through all categories
- [ ] Responsive large font sizes for venue screens
- [ ] Add `/leaderboard/:eventId` route to `MainContent`

---

### ⬜ Public Registration (`/register/:orgSlug`)

Not started. Public route, no auth or sidebar.

- [ ] Standalone layout (no sidebar, no header)
- [ ] Org lookup by slug; states: connecting / not found / registration closed / form
- [ ] Registration form: first name\*, last name\*, email, phone, DOB
- [ ] Submit → `registerRiderWithOrgSlug`
- [ ] Success and error states after submission
- [ ] Add `/register/:orgSlug` route outside the main layout in `MainContent`

---

### 🔧 Dashboard (`/`)

Currently shows hardcoded mock stats. Low priority, but should show real data eventually.

- [ ] Pinned events list (from `pinned_event` table)
- [ ] Upcoming events for the active org
- [ ] Replace mock stat cards with real org-level counts

---

## Cross-Cutting Work

### Routing

- [ ] Add sidebar entries + `MainContent` routes for: Riders, Championships, Events
- [ ] Add routes outside main layout for: Leaderboard, Track Display, Public Registration
- [ ] Fix Locations detail to use URL param (`/locations/:id`) instead of component state

### Auth & Permissions

Port these permission helpers from old client to client2:

- [ ] `canOrganizeEvent(eventId)` — event manage access
- [ ] `canManageOrgEvents()` — riders, locations, championships CRUD
- [ ] `canManageOrg()` — org settings
- [ ] `isOrgOwner()` — ownership transfer
- [ ] `canImpersonate()` — admin impersonation

### Active Org Context

- [ ] All views that filter by `orgId` need access to the active org (Riders, Championships, Events, Locations)
- [ ] Verify org switcher works correctly when user belongs to multiple orgs
