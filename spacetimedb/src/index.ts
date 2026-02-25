import { schema, table, t, SenderError } from 'spacetimedb/server';

// Replace with your Google OAuth Client ID
const GOOGLE_ISSUER = 'https://accounts.google.com';
const GOOGLE_CLIENT_ID = '68833734379-bdso8flf8pa67n4vul12hench3oeo520.apps.googleusercontent.com';

const spacetimedb = schema({
  // ─── Auth & RBAC tables ─────────────────────────────────────────────────

  user: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      identity: t.identity().unique(),
      google_sub: t.string().unique(),
      email: t.string(),
      name: t.string(),
      is_super_admin: t.bool(),
    }
  ),

  organization: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      name: t.string().unique(),
      owner_user_id: t.u64().index('btree'),
    }
  ),

  // role: 'admin' | 'manager'
  org_member: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      org_id: t.u64().index('btree'),
      user_id: t.u64().index('btree'),
      role: t.string(),
    }
  ),

  // role: 'organizer' | 'timekeeper'
  event_member: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      event_id: t.u64().index('btree'),
      user_id: t.u64().index('btree'),
      role: t.string(),
    }
  ),

  // ─── Domain tables ──────────────────────────────────────────────────────

  championship: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      org_id: t.u64().index('btree'),
      name: t.string(),
      description: t.string(),
      color: t.string(), // hex color e.g. "#3b82f6"
    }
  ),

  venue: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      name: t.string(),
      description: t.string(),
      latitude: t.f64(),
      longitude: t.f64(),
    }
  ),

  event: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      org_id: t.u64().index('btree'),
      championship_id: t.u64().index('btree'),
      venue_id: t.u64().index('btree'),
      name: t.string(),
      description: t.string(),
      start_date: t.string(),
      end_date: t.string(),
    }
  ),

  track: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      venue_id: t.u64().index('btree'),
      name: t.string(),
    }
  ),

  track_variation: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      track_id: t.u64().index('btree'),
      name: t.string(),
      description: t.string(),
      start_latitude: t.f64(),
      start_longitude: t.f64(),
      end_latitude: t.f64(),
      end_longitude: t.f64(),
    }
  ),

  rider: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      org_id: t.u64().index('btree'),
      first_name: t.string(),
      last_name: t.string(),
      email: t.string(),
      phone: t.string(),
      date_of_birth: t.string(),
    }
  ),

  registration_token: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      org_id: t.u64().index('btree'),
      token: t.string().unique(),
      created_by_user_id: t.u64(),
      is_active: t.bool(),
    }
  ),

  event_track: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      event_id: t.u64().index('btree'),
      track_variation_id: t.u64().index('btree'),
      sort_order: t.u32(),
    }
  ),

  event_rider: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      event_id: t.u64().index('btree'),
      rider_id: t.u64().index('btree'),
    }
  ),

  run: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      event_track_id: t.u64().index('btree'),
      rider_id: t.u64().index('btree'),
      sort_order: t.u32(),
      status: t.string(),
      start_time: t.u64(),
      end_time: t.u64(),
    }
  ),

  pinned_event: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      user_id: t.u64().index('btree'),
      event_id: t.u64().index('btree'),
    }
  ),
});

export default spacetimedb;

// ─── Auth helpers ───────────────────────────────────────────────────────────

function getUser(ctx: any) {
  for (const u of ctx.db.user.iter()) {
    if (u.identity.isEqual(ctx.sender)) return u;
  }
  return null;
}

function requireUser(ctx: any) {
  const user = getUser(ctx);
  if (!user) throw new SenderError('Not authenticated');
  return user;
}

// Check if user is the org owner
function isOrgOwner(ctx: any, userId: bigint, orgId: bigint): boolean {
  const org = ctx.db.organization.id.find(orgId);
  return org !== null && org.owner_user_id === userId;
}

// Check if user has org-level role (admin or manager) for a given org.
// Org owners are implicitly treated as 'admin'.
function getOrgRole(ctx: any, userId: bigint, orgId: bigint): string | null {
  if (isOrgOwner(ctx, userId, orgId)) return 'admin';
  for (const m of ctx.db.org_member.iter()) {
    if (m.user_id === userId && m.org_id === orgId) return m.role;
  }
  return null;
}

// Check if user has event-level role for a given event
function getEventRole(ctx: any, userId: bigint, eventId: bigint): string | null {
  for (const m of ctx.db.event_member.iter()) {
    if (m.user_id === userId && m.event_id === eventId) return m.role;
  }
  return null;
}

// Can the user manage this org? (admin only)
function requireOrgAdmin(ctx: any, orgId: bigint) {
  const user = requireUser(ctx);
  if (user.is_super_admin) return user;
  const role = getOrgRole(ctx, user.id, orgId);
  if (role !== 'admin') throw new SenderError('Org admin access required');
  return user;
}

// Can the user manage events in this org? (admin or manager)
function requireOrgEventManager(ctx: any, orgId: bigint) {
  const user = requireUser(ctx);
  if (user.is_super_admin) return user;
  const role = getOrgRole(ctx, user.id, orgId);
  if (role !== 'admin' && role !== 'manager') throw new SenderError('Org admin or manager access required');
  return user;
}

// Can the user manage this specific event? (org admin/manager OR event organizer)
function requireEventOrganizer(ctx: any, eventId: bigint) {
  const user = requireUser(ctx);
  if (user.is_super_admin) return user;
  const evt = ctx.db.event.id.find(eventId);
  if (!evt) throw new SenderError('Event not found');
  const orgRole = getOrgRole(ctx, user.id, evt.org_id);
  if (orgRole === 'admin' || orgRole === 'manager') return user;
  const evtRole = getEventRole(ctx, user.id, eventId);
  if (evtRole === 'organizer') return user;
  throw new SenderError('Event organizer access required');
}

// Can the user do timekeeping? (org role OR event organizer/timekeeper)
function requireTimekeeper(ctx: any, eventId: bigint) {
  const user = requireUser(ctx);
  if (user.is_super_admin) return user;
  const evt = ctx.db.event.id.find(eventId);
  if (!evt) throw new SenderError('Event not found');
  const orgRole = getOrgRole(ctx, user.id, evt.org_id);
  if (orgRole) return user;
  const evtRole = getEventRole(ctx, user.id, eventId);
  if (evtRole === 'organizer' || evtRole === 'timekeeper') return user;
  throw new SenderError('Timekeeper access required');
}

// Resolve event_id from a run via event_track
function getEventIdFromRun(ctx: any, runId: bigint): bigint {
  const run = ctx.db.run.id.find(runId);
  if (!run) throw new SenderError('Run not found');
  const et = ctx.db.event_track.id.find(run.event_track_id);
  if (!et) throw new SenderError('Event track not found');
  return et.event_id;
}

function getEventIdFromEventTrack(ctx: any, eventTrackId: bigint): bigint {
  const et = ctx.db.event_track.id.find(eventTrackId);
  if (!et) throw new SenderError('Event track not found');
  return et.event_id;
}

// ─── Lifecycle: upsert user on connect ──────────────────────────────────────

// Generate a unique org name by appending a suffix if needed
function generateUniqueOrgName(ctx: any, baseName: string): string {
  let candidate = baseName;
  let attempt = 0;
  while (true) {
    let taken = false;
    for (const o of ctx.db.organization.iter()) {
      if (o.name === candidate) { taken = true; break; }
    }
    if (!taken) return candidate;
    attempt++;
    candidate = `${baseName} ${attempt}`;
  }
}

export const on_connect = spacetimedb.clientConnected((ctx) => {
  const jwt = ctx.senderAuth.jwt;
  // Anonymous connections are allowed (read-only via subscriptions)
  if (!jwt) return;

  const sub = jwt.subject;
  const email = (jwt.fullPayload['email'] as string) ?? '';
  const name = (jwt.fullPayload['name'] as string) ?? '';

  // Check if user already exists by google_sub
  let existing = null;
  for (const u of ctx.db.user.iter()) {
    if (u.google_sub === sub) { existing = u; break; }
  }

  let userId: bigint;

  if (existing) {
    // Update identity, email, name on each login
    ctx.db.user.id.update({
      id: existing.id,
      identity: ctx.sender,
      google_sub: existing.google_sub,
      email: email || existing.email,
      name: name || existing.name,
      is_super_admin: existing.is_super_admin,
    });
    userId = existing.id;
  } else {
    const newUser = ctx.db.user.insert({
      id: 0n,
      identity: ctx.sender,
      google_sub: sub,
      email,
      name,
      is_super_admin: false,
    });
    userId = newUser.id;
  }

  // Auto-create an org if the user doesn't own one
  let hasOrg = false;
  for (const o of ctx.db.organization.iter()) {
    if (o.owner_user_id === userId) { hasOrg = true; break; }
  }
  if (!hasOrg) {
    const displayName = name || email.split('@')[0] || 'User';
    const orgName = generateUniqueOrgName(ctx, `${displayName}'s Organization`);
    ctx.db.organization.insert({ id: 0n, name: orgName, owner_user_id: userId });
  }
});

// ─── Organization reducers ──────────────────────────────────────────────────

export const create_organization = spacetimedb.reducer(
  { name: t.string() },
  (ctx, args) => {
    const user = requireUser(ctx);
    const org = ctx.db.organization.insert({ id: 0n, name: args.name, owner_user_id: user.id });
    // Creator becomes admin
    ctx.db.org_member.insert({ id: 0n, org_id: org.id, user_id: user.id, role: 'admin' });
  }
);

export const rename_organization = spacetimedb.reducer(
  { org_id: t.u64(), name: t.string() },
  (ctx, args) => {
    requireOrgAdmin(ctx, args.org_id);
    const trimmed = args.name.trim();
    if (trimmed.length === 0) throw new SenderError('Name cannot be empty');
    // Check uniqueness
    for (const o of ctx.db.organization.iter()) {
      if (o.id !== args.org_id && o.name === trimmed) {
        throw new SenderError('An organization with that name already exists');
      }
    }
    const org = ctx.db.organization.id.find(args.org_id);
    if (!org) throw new SenderError('Organization not found');
    ctx.db.organization.id.update({ ...org, name: trimmed });
  }
);

export const add_org_member = spacetimedb.reducer(
  { org_id: t.u64(), user_id: t.u64(), role: t.string() },
  (ctx, args) => {
    requireOrgAdmin(ctx, args.org_id);
    if (args.role !== 'admin' && args.role !== 'manager') throw new SenderError('Invalid role');
    // Prevent duplicates
    for (const m of ctx.db.org_member.iter()) {
      if (m.org_id === args.org_id && m.user_id === args.user_id) throw new SenderError('User already a member');
    }
    ctx.db.org_member.insert({ id: 0n, org_id: args.org_id, user_id: args.user_id, role: args.role });
  }
);

export const remove_org_member = spacetimedb.reducer(
  { org_member_id: t.u64() },
  (ctx, args) => {
    const member = ctx.db.org_member.id.find(args.org_member_id);
    if (!member) throw new SenderError('Member not found');
    requireOrgAdmin(ctx, member.org_id);
    ctx.db.org_member.id.delete(member.id);
  }
);

// ─── Event member reducers ──────────────────────────────────────────────────

export const add_event_member = spacetimedb.reducer(
  { event_id: t.u64(), user_id: t.u64(), role: t.string() },
  (ctx, args) => {
    requireEventOrganizer(ctx, args.event_id);
    if (args.role !== 'organizer' && args.role !== 'timekeeper') throw new SenderError('Invalid role');
    for (const m of ctx.db.event_member.iter()) {
      if (m.event_id === args.event_id && m.user_id === args.user_id) throw new SenderError('User already assigned');
    }
    ctx.db.event_member.insert({ id: 0n, event_id: args.event_id, user_id: args.user_id, role: args.role });
  }
);

export const remove_event_member = spacetimedb.reducer(
  { event_member_id: t.u64() },
  (ctx, args) => {
    const member = ctx.db.event_member.id.find(args.event_member_id);
    if (!member) throw new SenderError('Member not found');
    requireEventOrganizer(ctx, member.event_id);
    ctx.db.event_member.id.delete(member.id);
  }
);

// ─── Championship (org-scoped) ──────────────────────────────────────────────

export const create_championship = spacetimedb.reducer(
  { org_id: t.u64(), name: t.string(), description: t.string(), color: t.string() },
  (ctx, args) => {
    requireOrgEventManager(ctx, args.org_id);
    ctx.db.championship.insert({ id: 0n, org_id: args.org_id, name: args.name, description: args.description, color: args.color || '#3b82f6' });
  }
);

export const update_championship = spacetimedb.reducer(
  { championship_id: t.u64(), name: t.string(), description: t.string(), color: t.string() },
  (ctx, args) => {
    const champ = ctx.db.championship.id.find(args.championship_id);
    if (!champ) throw new SenderError('Championship not found');
    requireOrgEventManager(ctx, champ.org_id);
    const trimmed = args.name.trim();
    if (trimmed.length === 0) throw new SenderError('Name cannot be empty');
    ctx.db.championship.id.update({ ...champ, name: trimmed, description: args.description, color: args.color || champ.color });
  }
);

// ─── Venue (any authenticated user can create) ──────────────────────────────

export const create_venue = spacetimedb.reducer(
  { name: t.string(), description: t.string(), latitude: t.f64(), longitude: t.f64() },
  (ctx, args) => {
    requireUser(ctx);
    ctx.db.venue.insert({ id: 0n, name: args.name, description: args.description, latitude: args.latitude, longitude: args.longitude });
  }
);

// ─── Event (org-scoped) ─────────────────────────────────────────────────────

export const create_event = spacetimedb.reducer(
  {
    org_id: t.u64(),
    championship_id: t.u64(),
    venue_id: t.u64(),
    name: t.string(),
    description: t.string(),
    start_date: t.string(),
    end_date: t.string(),
  },
  (ctx, args) => {
    requireOrgEventManager(ctx, args.org_id);
    ctx.db.event.insert({
      id: 0n,
      org_id: args.org_id,
      championship_id: args.championship_id,
      venue_id: args.venue_id,
      name: args.name,
      description: args.description,
      start_date: args.start_date,
      end_date: args.end_date,
    });
  }
);

// ─── Pinned events ────────────────────────────────────────────────────────

export const toggle_pin_event = spacetimedb.reducer(
  { event_id: t.u64() },
  (ctx, args) => {
    const user = requireUser(ctx);
    // Check if already pinned
    for (const f of ctx.db.pinned_event.iter()) {
      if (f.user_id === user.id && f.event_id === args.event_id) {
        ctx.db.pinned_event.id.delete(f.id);
        return;
      }
    }
    ctx.db.pinned_event.insert({ id: 0n, user_id: user.id, event_id: args.event_id });
  }
);

// ─── Track (any authenticated user) ─────────────────────────────────────────

export const create_track = spacetimedb.reducer(
  { venue_id: t.u64(), name: t.string() },
  (ctx, args) => {
    requireUser(ctx);
    ctx.db.track.insert({ id: 0n, venue_id: args.venue_id, name: args.name });
  }
);

export const create_track_variation = spacetimedb.reducer(
  {
    track_id: t.u64(),
    name: t.string(),
    description: t.string(),
    start_latitude: t.f64(),
    start_longitude: t.f64(),
    end_latitude: t.f64(),
    end_longitude: t.f64(),
  },
  (ctx, args) => {
    requireUser(ctx);
    ctx.db.track_variation.insert({
      id: 0n,
      track_id: args.track_id,
      name: args.name,
      description: args.description,
      start_latitude: args.start_latitude,
      start_longitude: args.start_longitude,
      end_latitude: args.end_latitude,
      end_longitude: args.end_longitude,
    });
  }
);

// ─── Rider management (org event manager+) ──────────────────────────────────

export const create_rider = spacetimedb.reducer(
  { org_id: t.u64(), first_name: t.string(), last_name: t.string(), email: t.string(), phone: t.string(), date_of_birth: t.string() },
  (ctx, args) => {
    requireOrgEventManager(ctx, args.org_id);
    ctx.db.rider.insert({ id: 0n, org_id: args.org_id, first_name: args.first_name, last_name: args.last_name, email: args.email, phone: args.phone, date_of_birth: args.date_of_birth });
  }
);

export const update_rider = spacetimedb.reducer(
  { rider_id: t.u64(), first_name: t.string(), last_name: t.string(), email: t.string(), phone: t.string(), date_of_birth: t.string() },
  (ctx, args) => {
    const rider = ctx.db.rider.id.find(args.rider_id);
    if (!rider) throw new SenderError('Rider not found');
    requireOrgEventManager(ctx, rider.org_id);
    ctx.db.rider.id.update({ ...rider, first_name: args.first_name, last_name: args.last_name, email: args.email, phone: args.phone, date_of_birth: args.date_of_birth });
  }
);

export const delete_rider = spacetimedb.reducer(
  { rider_id: t.u64() },
  (ctx, args) => {
    const rider = ctx.db.rider.id.find(args.rider_id);
    if (!rider) throw new SenderError('Rider not found');
    requireOrgEventManager(ctx, rider.org_id);
    // Remove from all events
    for (const er of ctx.db.event_rider.iter()) {
      if (er.rider_id === rider.id) ctx.db.event_rider.id.delete(er.id);
    }
    ctx.db.rider.id.delete(rider.id);
  }
);

// ─── Registration tokens ────────────────────────────────────────────────────

// Simple token generator using timestamp + identity hash
function generateToken(ctx: any): string {
  const ts = Date.now().toString(36);
  const id = ctx.sender.toHexString().slice(0, 8);
  // Combine parts for a short unique token
  let counter = 0n;
  for (const _ of ctx.db.registration_token.iter()) counter++;
  return `${ts}${id}${counter.toString(36)}`;
}

export const create_registration_token = spacetimedb.reducer(
  { org_id: t.u64() },
  (ctx, args) => {
    const user = requireOrgEventManager(ctx, args.org_id);
    const token = generateToken(ctx);
    ctx.db.registration_token.insert({ id: 0n, org_id: args.org_id, token, created_by_user_id: user.id, is_active: true });
  }
);

export const deactivate_registration_token = spacetimedb.reducer(
  { token_id: t.u64() },
  (ctx, args) => {
    const tok = ctx.db.registration_token.id.find(args.token_id);
    if (!tok) throw new SenderError('Token not found');
    requireOrgEventManager(ctx, tok.org_id);
    ctx.db.registration_token.id.update({ ...tok, is_active: false });
  }
);

// Public reducer — anyone with a valid token can register as a rider
export const register_rider_with_token = spacetimedb.reducer(
  { token: t.string(), first_name: t.string(), last_name: t.string(), email: t.string(), phone: t.string(), date_of_birth: t.string() },
  (ctx, args) => {
    // Find active token
    let tok = null;
    for (const t of ctx.db.registration_token.iter()) {
      if (t.token === args.token && t.is_active) { tok = t; break; }
    }
    if (!tok) throw new SenderError('Invalid or expired registration link');
    ctx.db.rider.insert({ id: 0n, org_id: tok.org_id, first_name: args.first_name, last_name: args.last_name, email: args.email, phone: args.phone, date_of_birth: args.date_of_birth });
  }
);

// ─── Event-Track linking (event organizer+) ─────────────────────────────────

export const add_track_to_event = spacetimedb.reducer(
  { event_id: t.u64(), track_variation_id: t.u64(), sort_order: t.u32() },
  (ctx, args) => {
    requireEventOrganizer(ctx, args.event_id);
    ctx.db.event_track.insert({ id: 0n, event_id: args.event_id, track_variation_id: args.track_variation_id, sort_order: args.sort_order });
  }
);

// ─── Event-Rider linking (event organizer+) ─────────────────────────────────

export const add_rider_to_event = spacetimedb.reducer(
  { event_id: t.u64(), rider_id: t.u64() },
  (ctx, args) => {
    requireEventOrganizer(ctx, args.event_id);
    ctx.db.event_rider.insert({ id: 0n, event_id: args.event_id, rider_id: args.rider_id });
  }
);

// ─── Run management (event organizer+) ──────────────────────────────────────

export const queue_run = spacetimedb.reducer(
  { event_track_id: t.u64(), rider_id: t.u64(), sort_order: t.u32() },
  (ctx, args) => {
    const eventId = getEventIdFromEventTrack(ctx, args.event_track_id);
    requireEventOrganizer(ctx, eventId);
    ctx.db.run.insert({
      id: 0n,
      event_track_id: args.event_track_id,
      rider_id: args.rider_id,
      sort_order: args.sort_order,
      status: 'queued',
      start_time: 0n,
      end_time: 0n,
    });
  }
);

// ─── Timekeeping (timekeeper+) ──────────────────────────────────────────────

export const start_run = spacetimedb.reducer(
  { run_id: t.u64() },
  (ctx, { run_id }) => {
    const eventId = getEventIdFromRun(ctx, run_id);
    requireTimekeeper(ctx, eventId);
    const run = ctx.db.run.id.find(run_id);
    if (!run || run.status !== 'queued') return;
    ctx.db.run.id.update({
      id: run.id,
      event_track_id: run.event_track_id,
      rider_id: run.rider_id,
      sort_order: run.sort_order,
      status: 'running',
      start_time: BigInt(Date.now()),
      end_time: 0n,
    });
  }
);

export const finish_run = spacetimedb.reducer(
  { run_id: t.u64() },
  (ctx, { run_id }) => {
    const eventId = getEventIdFromRun(ctx, run_id);
    requireTimekeeper(ctx, eventId);
    const run = ctx.db.run.id.find(run_id);
    if (!run || run.status !== 'running') return;
    ctx.db.run.id.update({
      id: run.id,
      event_track_id: run.event_track_id,
      rider_id: run.rider_id,
      sort_order: run.sort_order,
      status: 'finished',
      start_time: run.start_time,
      end_time: BigInt(Date.now()),
    });
  }
);

export const dnf_run = spacetimedb.reducer(
  { run_id: t.u64() },
  (ctx, { run_id }) => {
    const eventId = getEventIdFromRun(ctx, run_id);
    requireTimekeeper(ctx, eventId);
    const run = ctx.db.run.id.find(run_id);
    if (!run || run.status !== 'running') return;
    ctx.db.run.id.update({
      id: run.id,
      event_track_id: run.event_track_id,
      rider_id: run.rider_id,
      sort_order: run.sort_order,
      status: 'dnf',
      start_time: run.start_time,
      end_time: 0n,
    });
  }
);

// ─── Seed demo data (no auth required — for development) ────────────────────

export const seed_demo_data = spacetimedb.reducer(
  (ctx) => {
    // Use the caller's existing org, or create a new one
    const caller = getUser(ctx);
    const ownerId = caller ? caller.id : 0n;
    let org = null;
    if (caller) {
      for (const o of ctx.db.organization.iter()) {
        if (o.owner_user_id === caller.id) { org = o; break; }
      }
    }
    if (!org) {
      const orgName = generateUniqueOrgName(ctx, 'Demo Racing Org');
      org = ctx.db.organization.insert({ id: 0n, name: orgName, owner_user_id: ownerId });
    }

    // Championships
    const champ1 = ctx.db.championship.insert({ id: 0n, org_id: org.id, name: 'Enduro Series 2025', description: 'Regional enduro mountain bike series', color: '#3b82f6' });
    const champ2 = ctx.db.championship.insert({ id: 0n, org_id: org.id, name: 'Downhill Cup 2025', description: 'Gravity-focused downhill racing', color: '#ef4444' });
    const champ3 = ctx.db.championship.insert({ id: 0n, org_id: org.id, name: 'XC Marathon Series', description: 'Cross-country endurance events', color: '#22c55e' });

    // Venues
    const venue1 = ctx.db.venue.insert({ id: 0n, name: 'Pine Mountain Bike Park', description: 'Technical enduro trails in the Blue Ridge', latitude: 38.8977, longitude: -77.0365 });
    const venue2 = ctx.db.venue.insert({ id: 0n, name: 'Eagle Rock Resort', description: 'Steep downhill runs with jumps', latitude: 40.9176, longitude: -76.0452 });
    const venue3 = ctx.db.venue.insert({ id: 0n, name: 'Lakeside Trails', description: 'Rolling singletrack around the lake', latitude: 35.5951, longitude: -82.5515 });

    // Tracks & variations
    const track1 = ctx.db.track.insert({ id: 0n, venue_id: venue1.id, name: 'Widow Maker' });
    const tv1 = ctx.db.track_variation.insert({ id: 0n, track_id: track1.id, name: 'Full Send', description: 'Top-to-bottom with rock gardens and drops', start_latitude: 38.900, start_longitude: -77.040, end_latitude: 38.895, end_longitude: -77.035 });
    const track2 = ctx.db.track.insert({ id: 0n, venue_id: venue1.id, name: 'Rock Garden' });
    const tv2 = ctx.db.track_variation.insert({ id: 0n, track_id: track2.id, name: 'Default', description: 'Technical rock garden descent', start_latitude: 38.899, start_longitude: -77.038, end_latitude: 38.894, end_longitude: -77.033 });
    const track3 = ctx.db.track.insert({ id: 0n, venue_id: venue2.id, name: 'Thunderbolt' });
    const tv3 = ctx.db.track_variation.insert({ id: 0n, track_id: track3.id, name: 'Race Line', description: 'Fast downhill with gap jumps', start_latitude: 40.920, start_longitude: -76.048, end_latitude: 40.915, end_longitude: -76.043 });
    const track4 = ctx.db.track.insert({ id: 0n, venue_id: venue3.id, name: 'Lakeshore Loop' });
    const tv4 = ctx.db.track_variation.insert({ id: 0n, track_id: track4.id, name: 'Full Loop', description: '25km singletrack loop', start_latitude: 35.598, start_longitude: -82.554, end_latitude: 35.595, end_longitude: -82.551 });

    // Enduro Series events
    const evt1 = ctx.db.event.insert({ id: 0n, org_id: org.id, championship_id: champ1.id, venue_id: venue1.id, name: 'Enduro R1 - Pine Mountain', description: 'Opening round', start_date: '2025-03-15', end_date: '2025-03-16' });
    const evt2 = ctx.db.event.insert({ id: 0n, org_id: org.id, championship_id: champ1.id, venue_id: venue2.id, name: 'Enduro R2 - Eagle Rock', description: 'Second round', start_date: '2025-05-10', end_date: '2025-05-11' });
    const evt3 = ctx.db.event.insert({ id: 0n, org_id: org.id, championship_id: champ1.id, venue_id: venue3.id, name: 'Enduro R3 - Lakeside', description: 'Season finale', start_date: '2025-07-19', end_date: '2025-07-20' });

    // Downhill Cup events
    const evt4 = ctx.db.event.insert({ id: 0n, org_id: org.id, championship_id: champ2.id, venue_id: venue2.id, name: 'DH Cup R1 - Eagle Rock', description: 'Downhill opener', start_date: '2025-04-05', end_date: '2025-04-06' });
    const evt5 = ctx.db.event.insert({ id: 0n, org_id: org.id, championship_id: champ2.id, venue_id: venue1.id, name: 'DH Cup R2 - Pine Mountain', description: 'Mid-season round', start_date: '2025-06-14', end_date: '2025-06-15' });

    // XC Marathon events
    const evt6 = ctx.db.event.insert({ id: 0n, org_id: org.id, championship_id: champ3.id, venue_id: venue3.id, name: 'XC Marathon R1 - Lakeside', description: 'Endurance opener', start_date: '2025-04-26', end_date: '2025-04-27' });
    const evt7 = ctx.db.event.insert({ id: 0n, org_id: org.id, championship_id: champ3.id, venue_id: venue1.id, name: 'XC Marathon R2 - Pine Mountain', description: 'Mountain stage', start_date: '2025-08-09', end_date: '2025-08-10' });

    // Event tracks
    const et1 = ctx.db.event_track.insert({ id: 0n, event_id: evt1.id, track_variation_id: tv1.id, sort_order: 1 });
    const et2 = ctx.db.event_track.insert({ id: 0n, event_id: evt1.id, track_variation_id: tv2.id, sort_order: 2 });
    ctx.db.event_track.insert({ id: 0n, event_id: evt2.id, track_variation_id: tv3.id, sort_order: 1 });
    ctx.db.event_track.insert({ id: 0n, event_id: evt3.id, track_variation_id: tv4.id, sort_order: 1 });
    ctx.db.event_track.insert({ id: 0n, event_id: evt4.id, track_variation_id: tv3.id, sort_order: 1 });
    ctx.db.event_track.insert({ id: 0n, event_id: evt5.id, track_variation_id: tv1.id, sort_order: 1 });
    ctx.db.event_track.insert({ id: 0n, event_id: evt6.id, track_variation_id: tv4.id, sort_order: 1 });
    ctx.db.event_track.insert({ id: 0n, event_id: evt7.id, track_variation_id: tv1.id, sort_order: 1 });

    // Riders
    const ridersData = [
      { first_name: 'Alex', last_name: 'Morgan', email: 'alex@example.com', phone: '+1-555-0101', date_of_birth: '1997-03-14' },
      { first_name: 'Sam', last_name: 'Rivera', email: 'sam@example.com', phone: '+1-555-0102', date_of_birth: '2001-07-22' },
      { first_name: 'Jordan', last_name: 'Chen', email: 'jordan@example.com', phone: '+1-555-0103', date_of_birth: '1994-11-05' },
      { first_name: 'Casey', last_name: 'Brooks', email: 'casey@example.com', phone: '+1-555-0104', date_of_birth: '1999-01-30' },
    ];

    const riders = ridersData.map((r) => {
      const rider = ctx.db.rider.insert({ id: 0n, org_id: org.id, first_name: r.first_name, last_name: r.last_name, email: r.email, phone: r.phone, date_of_birth: r.date_of_birth });
      // Register riders for the first event
      ctx.db.event_rider.insert({ id: 0n, event_id: evt1.id, rider_id: rider.id });
      return rider;
    });

    // Queue runs for first event's tracks
    for (const etId of [et1.id, et2.id]) {
      let order = 1;
      for (const rider of riders) {
        ctx.db.run.insert({
          id: 0n,
          event_track_id: etId,
          rider_id: rider.id,
          sort_order: order++,
          status: 'queued',
          start_time: 0n,
          end_time: 0n,
        });
      }
    }
  }
);
