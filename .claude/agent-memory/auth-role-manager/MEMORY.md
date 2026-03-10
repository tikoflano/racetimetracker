# Auth Role Manager - Memory

## Project Architecture
- **Platform**: SpacetimeDB (real-time database with server-side reducers, no traditional REST API)
- **Client**: React (Mantine UI) in `client2/`, connected via WebSocket + SpacetimeDB SDK
- **Server logic**: `spacetimedb/src/` - TypeScript reducers (server-side functions)
- **Auth library**: Custom, in `spacetimedb/src/lib/auth.ts`

## Authentication
- Google OAuth via JWT (issuer: `https://accounts.google.com`)
- Identity resolved in `on_connect` lifecycle handler (`spacetimedb/src/reducers/lifecycle.ts`)
- Anonymous WebSocket connections allowed (read-only via subscriptions)
- Pending users created with `google_sub: "pending:<email>"` before they log in
- User table has `is_super_admin: bool` flag (global bypass)

## Role Hierarchy (two scopes)

### Organization-level roles (`org_member.role` string field)
- **owner** - implicit via `organization.owner_user_id` (not stored in org_member.role)
- **admin** - full org management (stored in org_member.role)
- **manager** - event/resource management (stored in org_member.role)
- **timekeeper** - time-tracking operations (stored in org_member.role)

### Event-level roles (`event_member.role` string field)
- **organizer** - event-specific management
- **timekeeper** - event-specific time-tracking

### Super admin
- `user.is_super_admin = true` bypasses all role checks

## Authorization Guard Functions (in `spacetimedb/src/lib/auth.ts`)
- `requireUser(ctx)` - authenticated user required
- `requireOrgAdmin(ctx, orgId)` - org admin or super_admin
- `requireOrgOwner(ctx, orgId)` - org owner or super_admin
- `requireOrgEventManager(ctx, orgId)` - org admin OR manager, or super_admin
- `requireEventOrganizer(ctx, eventId)` - org admin/manager OR event organizer, or super_admin
- `requireTimekeeper(ctx, eventId)` - any org role OR event organizer/timekeeper, or super_admin
- `requireLocationManager(ctx, venueId)` - delegates to requireOrgEventManager via venue's org_id
- `getOrgRole(ctx, userId, orgId)` - returns role string or null (owner -> 'admin')
- `getEventRole(ctx, userId, eventId)` - returns role string or null
- `getUser(ctx)` / `getRealUser(ctx)` - impersonation-aware user resolution

## Permission Matrix (see auth-permissions.md for full table)

## Key Files
- `spacetimedb/src/lib/auth.ts` - all auth guard functions
- `spacetimedb/src/schema/tables.ts` - table/role definitions
- `spacetimedb/src/reducers/lifecycle.ts` - on_connect (user creation/auth)
- `spacetimedb/src/reducers/impersonation.ts` - admin impersonation logic
- `spacetimedb/src/reducers/dev.ts` - UNPROTECTED wipe_all_data and transfer_org_ownership_by_email
- `client2/src/components/main-content/MembersView.tsx` - client-side members UI

## Known Issues / Gaps
- Roles stored as raw strings, not enums (risk of typos)
- `wipe_all_data` and `transfer_org_ownership_by_email` in dev.ts have NO auth checks
- `seed_demo_data` has NO auth check
- `register_rider_with_org_slug` only checks `registration_enabled` flag, no user auth
- All tables are `{ public: true }` except `impersonation` - all data readable by any connected client
- No client-side route guards or permission-based UI hiding (except minor inline checks in MembersView)
- `org_member` table allows role values beyond the 3 valid ones at the DB schema level
- No `is_super_admin` protection - anyone who can modify the user table could self-elevate
