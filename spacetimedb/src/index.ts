import { schema, table, t, SenderError } from 'spacetimedb/server';
import { Identity } from 'spacetimedb';

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
      picture: t.string(),
      is_super_admin: t.bool(),
    }
  ),

  organization: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      name: t.string().unique(),
      slug: t.string().unique(),
      owner_user_id: t.u64().index('btree'),
    }
  ),

  // role: 'admin' | 'manager' | 'timekeeper'
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
      org_id: t.u64().index('btree'),
      name: t.string(),
      description: t.string(),
      address: t.string(),
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
      slug: t.string(),
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
      color: t.string(),
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
      category_id: t.u64(),  // 0 = no category
      checked_in: t.bool(),
      assigned_number: t.u32().default(0),  // 0 = use default from category
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

  // Per-track schedule config: start time (ms) and interval between riders (seconds)
  event_track_schedule: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      event_track_id: t.u64().unique(),
      start_time: t.u64(),
      interval_seconds: t.u32(),
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

  event_category: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      event_id: t.u64().index('btree'),
      name: t.string(),
      description: t.string(),
      number_range_start: t.u32(),
      number_range_end: t.u32(),
    }
  ),

  // Tracks that riders in this category will race on (subset of event tracks)
  category_track: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      category_id: t.u64().index('btree'),
      event_track_id: t.u64().index('btree'),
    }
  ),

  // Clock sync: one row per user, overwritten on each request
  server_time_response: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      identity: t.identity().unique(),
      server_time: t.u64(),
      request_id: t.u64(),
    }
  ),

  // Private: only the server reads this for permission resolution
  impersonation: table(
    { public: false },
    {
      id: t.u64().primaryKey().autoInc(),
      admin_identity: t.identity().unique(),
      target_user_id: t.u64(),
      org_id: t.u64(), // 0 = super_admin (all orgs), otherwise scoped to this org
    }
  ),

  // Public mirror so the client knows its own impersonation state
  impersonation_status: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      admin_identity: t.identity().unique(),
      target_user_id: t.u64(),
      target_user_name: t.string(),
      org_id: t.u64(),
    }
  ),

  image: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      entity_type: t.string(), // 'venue' | 'track' | 'track_variation'
      entity_id: t.u64().index('btree'),
      data: t.string(), // base64 data URI
      caption: t.string(),
      sort_order: t.u32(),
    }
  ),

  // position: 'start' | 'end' | 'both'
  timekeeper_assignment: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      event_track_id: t.u64().index('btree'),
      user_id: t.u64().index('btree'),
      position: t.string(),
    }
  ),
});

export default spacetimedb;

function placeholderIdentity(email: string): Identity {
  let hash = 1n;
  for (let i = 0; i < email.length; i++) {
    hash = hash * 31n + BigInt(email.charCodeAt(i));
  }
  return new Identity(hash);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'untitled';
}

function uniqueOrgSlug(ctx: any, base: string): string {
  let candidate = base;
  let n = 1;
  while (true) {
    let taken = false;
    for (const o of ctx.db.organization.iter()) {
      if (o.slug === candidate) { taken = true; break; }
    }
    if (!taken) return candidate;
    candidate = `${base}-${++n}`;
  }
}

function uniqueEventSlug(ctx: any, orgId: bigint, base: string, excludeId?: bigint): string {
  let candidate = base;
  let n = 1;
  while (true) {
    let taken = false;
    for (const e of ctx.db.event.iter()) {
      if (e.org_id === orgId && e.slug === candidate && e.id !== excludeId) { taken = true; break; }
    }
    if (!taken) return candidate;
    candidate = `${base}-${++n}`;
  }
}

// ─── Auth helpers ───────────────────────────────────────────────────────────

// Returns the real user for ctx.sender (no impersonation).
// Used by clientConnected and impersonation management.
function getRealUser(ctx: any) {
  for (const u of ctx.db.user.iter()) {
    if (u.identity.isEqual(ctx.sender)) return u;
  }
  return null;
}

// Returns the effective user: the impersonated user if an active
// impersonation exists for this caller, otherwise the real user.
function getUser(ctx: any) {
  for (const imp of ctx.db.impersonation.iter()) {
    if (imp.admin_identity.isEqual(ctx.sender)) {
      const target = ctx.db.user.id.find(imp.target_user_id);
      if (target) return target;
    }
  }
  return getRealUser(ctx);
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

// Can the user transfer ownership? (org owner only)
function requireOrgOwner(ctx: any, orgId: bigint) {
  const user = requireUser(ctx);
  if (user.is_super_admin) return user;
  if (!isOrgOwner(ctx, user.id, orgId)) throw new SenderError('Only the org owner can transfer ownership');
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
  const picture = (jwt.fullPayload['picture'] as string) ?? '';

  // Check if user already exists by google_sub
  let existing = null;
  for (const u of ctx.db.user.iter()) {
    if (u.google_sub === sub) { existing = u; break; }
  }

  // If not found by google_sub, check for a pending user with the same email
  if (!existing && email) {
    for (const u of ctx.db.user.iter()) {
      if (u.email === email && u.google_sub.startsWith('pending:')) { existing = u; break; }
    }
  }

  let userId: bigint;

  if (existing) {
    ctx.db.user.id.update({
      id: existing.id,
      identity: ctx.sender,
      google_sub: sub,
      email: email || existing.email,
      name: name || existing.name,
      picture: picture || existing.picture,
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
      picture,
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
    ctx.db.organization.insert({ id: 0n, name: orgName, slug: uniqueOrgSlug(ctx, slugify(orgName)), owner_user_id: userId });
  }
});

// ─── Organization reducers ──────────────────────────────────────────────────

export const create_organization = spacetimedb.reducer(
  { name: t.string() },
  (ctx, args) => {
    const user = requireUser(ctx);
    const org = ctx.db.organization.insert({ id: 0n, name: args.name, slug: uniqueOrgSlug(ctx, slugify(args.name)), owner_user_id: user.id });
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
    const newSlug = uniqueOrgSlug(ctx, slugify(trimmed));
    ctx.db.organization.id.update({ ...org, name: trimmed, slug: newSlug });
  }
);

export const add_org_member = spacetimedb.reducer(
  { org_id: t.u64(), user_id: t.u64(), role: t.string() },
  (ctx, args) => {
    requireOrgAdmin(ctx, args.org_id);
    if (args.role !== 'admin' && args.role !== 'manager' && args.role !== 'timekeeper') throw new SenderError('Invalid role');
    // Prevent duplicates
    for (const m of ctx.db.org_member.iter()) {
      if (m.org_id === args.org_id && m.user_id === args.user_id) throw new SenderError('User already a member');
    }
    ctx.db.org_member.insert({ id: 0n, org_id: args.org_id, user_id: args.user_id, role: args.role });
  }
);

export const invite_org_member = spacetimedb.reducer(
  { org_id: t.u64(), email: t.string(), role: t.string() },
  (ctx, args) => {
    requireOrgAdmin(ctx, args.org_id);
    if (args.role !== 'admin' && args.role !== 'manager' && args.role !== 'timekeeper') throw new SenderError('Invalid role');

    const trimmedEmail = args.email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) throw new SenderError('Valid email is required');

    let targetUser = null;
    for (const u of ctx.db.user.iter()) {
      if (u.email === trimmedEmail) { targetUser = u; break; }
    }

    if (!targetUser) {
      targetUser = ctx.db.user.insert({
        id: 0n,
        identity: placeholderIdentity(trimmedEmail),
        google_sub: `pending:${trimmedEmail}`,
        email: trimmedEmail,
        name: trimmedEmail.split('@')[0],
        picture: '',
        is_super_admin: false,
      });
    }

    for (const m of ctx.db.org_member.iter()) {
      if (m.org_id === args.org_id && m.user_id === targetUser.id) {
        throw new SenderError('User already a member');
      }
    }
    ctx.db.org_member.insert({ id: 0n, org_id: args.org_id, user_id: targetUser.id, role: args.role });
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

export const leave_organization = spacetimedb.reducer(
  { org_id: t.u64() },
  (ctx, args) => {
    const user = requireUser(ctx);
    const org = ctx.db.organization.id.find(args.org_id);
    if (!org) throw new SenderError('Organization not found');

    // Find caller's membership
    let myMember = null;
    for (const m of ctx.db.org_member.iter()) {
      if (m.org_id === args.org_id && m.user_id === user.id) { myMember = m; break; }
    }

    // Check if there are other real (non-pending) admins
    let hasOtherAdmin = false;
    if (org.owner_user_id !== user.id) {
      hasOtherAdmin = true; // owner stays
    } else {
      for (const m of ctx.db.org_member.iter()) {
        if (m.org_id === args.org_id && m.user_id !== user.id && m.role === 'admin') {
          const u = ctx.db.user.id.find(m.user_id);
          if (u && !u.google_sub.startsWith('pending:')) { hasOtherAdmin = true; break; }
        }
      }
    }

    // Remove membership
    if (myMember) ctx.db.org_member.id.delete(myMember.id);

    if (hasOtherAdmin) return;

    // No other admins — delete the org and all its data
    for (const evt of ctx.db.event.iter()) {
      if (evt.org_id !== args.org_id) continue;
      for (const et of ctx.db.event_track.iter()) {
        if (et.event_id !== evt.id) continue;
        for (const r of ctx.db.run.iter()) { if (r.event_track_id === et.id) ctx.db.run.id.delete(r.id); }
        for (const s of ctx.db.event_track_schedule.iter()) { if (s.event_track_id === et.id) ctx.db.event_track_schedule.id.delete(s.id); }
        for (const a of ctx.db.timekeeper_assignment.iter()) { if (a.event_track_id === et.id) ctx.db.timekeeper_assignment.id.delete(a.id); }
        ctx.db.event_track.id.delete(et.id);
      }
      for (const er of ctx.db.event_rider.iter()) { if (er.event_id === evt.id) ctx.db.event_rider.id.delete(er.id); }
      for (const em of ctx.db.event_member.iter()) { if (em.event_id === evt.id) ctx.db.event_member.id.delete(em.id); }
      for (const ec of ctx.db.event_category.iter()) {
        if (ec.event_id !== evt.id) continue;
        for (const ct of ctx.db.category_track.iter()) { if (ct.category_id === ec.id) ctx.db.category_track.id.delete(ct.id); }
        ctx.db.event_category.id.delete(ec.id);
      }
      for (const pe of ctx.db.pinned_event.iter()) { if (pe.event_id === evt.id) ctx.db.pinned_event.id.delete(pe.id); }
      ctx.db.event.id.delete(evt.id);
    }
    for (const c of ctx.db.championship.iter()) { if (c.org_id === args.org_id) ctx.db.championship.id.delete(c.id); }
    for (const v of ctx.db.venue.iter()) {
      if (v.org_id !== args.org_id) continue;
      for (const t of ctx.db.track.iter()) {
        if (t.venue_id !== v.id) continue;
        for (const tv of ctx.db.track_variation.iter()) { if (tv.track_id === t.id) ctx.db.track_variation.id.delete(tv.id); }
        ctx.db.track.id.delete(t.id);
      }
      ctx.db.venue.id.delete(v.id);
    }
    for (const r of ctx.db.rider.iter()) { if (r.org_id === args.org_id) ctx.db.rider.id.delete(r.id); }
    for (const rt of ctx.db.registration_token.iter()) { if (rt.org_id === args.org_id) ctx.db.registration_token.id.delete(rt.id); }
    for (const m of ctx.db.org_member.iter()) { if (m.org_id === args.org_id) ctx.db.org_member.id.delete(m.id); }
    ctx.db.organization.id.delete(args.org_id);
  }
);

export const transfer_org_ownership = spacetimedb.reducer(
  { org_id: t.u64(), new_owner_user_id: t.u64() },
  (ctx, args) => {
    requireOrgOwner(ctx, args.org_id);
    const org = ctx.db.organization.id.find(args.org_id);
    if (!org) throw new SenderError('Organization not found');
    if (org.owner_user_id === args.new_owner_user_id) throw new SenderError('User is already the owner');
    const newOwner = ctx.db.user.id.find(args.new_owner_user_id);
    if (!newOwner) throw new SenderError('New owner user not found');
    ctx.db.organization.id.update({ ...org, owner_user_id: args.new_owner_user_id });
    // Ensure new owner has admin role (add or update org_member)
    let member = null;
    for (const m of ctx.db.org_member.iter()) {
      if (m.org_id === args.org_id && m.user_id === args.new_owner_user_id) { member = m; break; }
    }
    if (member) {
      if (member.role !== 'admin') ctx.db.org_member.id.update({ ...member, role: 'admin' });
    } else {
      ctx.db.org_member.insert({ id: 0n, org_id: args.org_id, user_id: args.new_owner_user_id, role: 'admin' });
    }
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

export const delete_championship = spacetimedb.reducer(
  { championship_id: t.u64() },
  (ctx, args) => {
    const champ = ctx.db.championship.id.find(args.championship_id);
    if (!champ) throw new SenderError('Championship not found');
    requireOrgEventManager(ctx, champ.org_id);
    // Delete all events in this championship and their associated data
    for (const evt of ctx.db.event.iter()) {
      if (evt.championship_id !== champ.id) continue;
      for (const et of ctx.db.event_track.iter()) {
        if (et.event_id !== evt.id) continue;
        for (const r of ctx.db.run.iter()) { if (r.event_track_id === et.id) ctx.db.run.id.delete(r.id); }
        for (const s of ctx.db.event_track_schedule.iter()) { if (s.event_track_id === et.id) ctx.db.event_track_schedule.id.delete(s.id); }
        for (const a of ctx.db.timekeeper_assignment.iter()) { if (a.event_track_id === et.id) ctx.db.timekeeper_assignment.id.delete(a.id); }
        ctx.db.event_track.id.delete(et.id);
      }
      for (const er of ctx.db.event_rider.iter()) { if (er.event_id === evt.id) ctx.db.event_rider.id.delete(er.id); }
      for (const em of ctx.db.event_member.iter()) { if (em.event_id === evt.id) ctx.db.event_member.id.delete(em.id); }
      for (const ec of ctx.db.event_category.iter()) {
        if (ec.event_id !== evt.id) continue;
        for (const ct of ctx.db.category_track.iter()) { if (ct.category_id === ec.id) ctx.db.category_track.id.delete(ct.id); }
        ctx.db.event_category.id.delete(ec.id);
      }
      for (const pe of ctx.db.pinned_event.iter()) { if (pe.event_id === evt.id) ctx.db.pinned_event.id.delete(pe.id); }
      ctx.db.event.id.delete(evt.id);
    }
    ctx.db.championship.id.delete(champ.id);
  }
);

// ─── Venue (org event manager+) ─────────────────────────────────────────────

export const create_venue = spacetimedb.reducer(
  { org_id: t.u64(), name: t.string(), description: t.string(), address: t.string() },
  (ctx, args) => {
    requireOrgEventManager(ctx, args.org_id);
    ctx.db.venue.insert({ id: 0n, org_id: args.org_id, name: args.name, description: args.description, address: args.address });
  }
);

export const update_venue = spacetimedb.reducer(
  { venue_id: t.u64(), name: t.string(), description: t.string(), address: t.string() },
  (ctx, args) => {
    const venue = ctx.db.venue.id.find(args.venue_id);
    if (!venue) throw new SenderError('Venue not found');
    requireOrgEventManager(ctx, venue.org_id);
    ctx.db.venue.id.update({ ...venue, name: args.name, description: args.description, address: args.address });
  }
);

export const delete_venue = spacetimedb.reducer(
  { venue_id: t.u64() },
  (ctx, args) => {
    const venue = ctx.db.venue.id.find(args.venue_id);
    if (!venue) throw new SenderError('Venue not found');
    requireOrgEventManager(ctx, venue.org_id);
    // Delete all tracks and their variations
    for (const track of ctx.db.track.iter()) {
      if (track.venue_id === venue.id) {
        for (const tv of ctx.db.track_variation.iter()) {
          if (tv.track_id === track.id) ctx.db.track_variation.id.delete(tv.id);
        }
        ctx.db.track.id.delete(track.id);
      }
    }
    ctx.db.venue.id.delete(venue.id);
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
    const trimmed = args.name.trim();
    if (!trimmed) throw new SenderError('Event name cannot be empty');
    for (const e of ctx.db.event.iter()) {
      if (e.championship_id === args.championship_id && e.name === trimmed) {
        throw new SenderError('An event with this name already exists in this championship');
      }
    }
    ctx.db.event.insert({
      id: 0n,
      org_id: args.org_id,
      championship_id: args.championship_id,
      venue_id: args.venue_id,
      name: trimmed,
      slug: uniqueEventSlug(ctx, args.org_id, slugify(trimmed)),
      description: args.description,
      start_date: args.start_date,
      end_date: args.end_date,
    });
  }
);

export const update_event = spacetimedb.reducer(
  { event_id: t.u64(), name: t.string(), description: t.string(), start_date: t.string(), end_date: t.string() },
  (ctx, args) => {
    const evt = ctx.db.event.id.find(args.event_id);
    if (!evt) throw new SenderError('Event not found');
    requireOrgEventManager(ctx, evt.org_id);
    // Enforce unique name within championship
    const trimmed = args.name.trim();
    if (!trimmed) throw new SenderError('Event name cannot be empty');
    for (const e of ctx.db.event.iter()) {
      if (e.championship_id === evt.championship_id && e.id !== evt.id && e.name === trimmed) {
        throw new SenderError('An event with this name already exists in this championship');
      }
    }
    const newSlug = trimmed !== evt.name ? uniqueEventSlug(ctx, evt.org_id, slugify(trimmed), evt.id) : evt.slug;
    ctx.db.event.id.update({ ...evt, name: trimmed, slug: newSlug, description: args.description, start_date: args.start_date, end_date: args.end_date });
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

// ─── Track (org event manager+ via venue) ───────────────────────────────────

function requireVenueManager(ctx: any, venueId: bigint) {
  const venue = ctx.db.venue.id.find(venueId);
  if (!venue) throw new SenderError('Venue not found');
  return requireOrgEventManager(ctx, venue.org_id);
}

export const create_track = spacetimedb.reducer(
  { venue_id: t.u64(), name: t.string(), color: t.string() },
  (ctx, args) => {
    requireVenueManager(ctx, args.venue_id);
    const track = ctx.db.track.insert({ id: 0n, venue_id: args.venue_id, name: args.name, color: args.color });
    ctx.db.track_variation.insert({
      id: 0n,
      track_id: track.id,
      name: 'Default',
      description: '',
      start_latitude: 0,
      start_longitude: 0,
      end_latitude: 0,
      end_longitude: 0,
    });
  }
);

export const update_track = spacetimedb.reducer(
  { track_id: t.u64(), name: t.string(), color: t.string() },
  (ctx, args) => {
    const track = ctx.db.track.id.find(args.track_id);
    if (!track) throw new SenderError('Track not found');
    requireVenueManager(ctx, track.venue_id);
    ctx.db.track.id.update({ ...track, name: args.name, color: args.color });
  }
);

export const delete_track = spacetimedb.reducer(
  { track_id: t.u64() },
  (ctx, args) => {
    const track = ctx.db.track.id.find(args.track_id);
    if (!track) throw new SenderError('Track not found');
    requireVenueManager(ctx, track.venue_id);
    for (const tv of ctx.db.track_variation.iter()) {
      if (tv.track_id === track.id) ctx.db.track_variation.id.delete(tv.id);
    }
    ctx.db.track.id.delete(track.id);
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
    const track = ctx.db.track.id.find(args.track_id);
    if (!track) throw new SenderError('Track not found');
    requireVenueManager(ctx, track.venue_id);
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

export const update_track_variation = spacetimedb.reducer(
  {
    variation_id: t.u64(),
    name: t.string(),
    description: t.string(),
    start_latitude: t.f64(),
    start_longitude: t.f64(),
    end_latitude: t.f64(),
    end_longitude: t.f64(),
  },
  (ctx, args) => {
    const tv = ctx.db.track_variation.id.find(args.variation_id);
    if (!tv) throw new SenderError('Track variation not found');
    const track = ctx.db.track.id.find(tv.track_id);
    if (!track) throw new SenderError('Track not found');
    requireVenueManager(ctx, track.venue_id);
    ctx.db.track_variation.id.update({
      ...tv,
      name: args.name,
      description: args.description,
      start_latitude: args.start_latitude,
      start_longitude: args.start_longitude,
      end_latitude: args.end_latitude,
      end_longitude: args.end_longitude,
    });
  }
);

export const delete_track_variation = spacetimedb.reducer(
  { variation_id: t.u64() },
  (ctx, args) => {
    const tv = ctx.db.track_variation.id.find(args.variation_id);
    if (!tv) throw new SenderError('Track variation not found');
    const track = ctx.db.track.id.find(tv.track_id);
    if (!track) throw new SenderError('Track not found');
    requireVenueManager(ctx, track.venue_id);
    // Don't allow deleting the last variation
    let count = 0;
    for (const v of ctx.db.track_variation.iter()) {
      if (v.track_id === track.id) count++;
    }
    if (count <= 1) throw new SenderError('Cannot delete the last variation. Delete the track instead.');
    ctx.db.track_variation.id.delete(tv.id);
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
    for (const et of ctx.db.event_track.iter()) {
      if (et.event_id === args.event_id && et.track_variation_id === args.track_variation_id) {
        throw new SenderError('This track variation is already added to the event');
      }
    }
    ctx.db.event_track.insert({ id: 0n, event_id: args.event_id, track_variation_id: args.track_variation_id, sort_order: args.sort_order });
  }
);

export const remove_track_from_event = spacetimedb.reducer(
  { event_track_id: t.u64() },
  (ctx, args) => {
    const et = ctx.db.event_track.id.find(args.event_track_id);
    if (!et) throw new SenderError('Event track not found');
    requireEventOrganizer(ctx, et.event_id);
    // Delete associated runs
    for (const run of ctx.db.run.iter()) {
      if (run.event_track_id === et.id) ctx.db.run.id.delete(run.id);
    }
    ctx.db.event_track.id.delete(et.id);
  }
);

// ─── Event categories (event organizer+) ────────────────────────────────────

// Check if a number range overlaps with any existing category in the event.
// excludeId allows skipping the category being updated.
function checkCategoryRangeOverlap(ctx: any, eventId: bigint, rangeStart: number, rangeEnd: number, excludeId: bigint | null) {
  for (const cat of ctx.db.event_category.iter()) {
    if (cat.event_id !== eventId) continue;
    if (excludeId !== null && cat.id === excludeId) continue;
    if (rangeStart <= cat.number_range_end && rangeEnd >= cat.number_range_start) {
      throw new SenderError(`Number range ${rangeStart}–${rangeEnd} overlaps with category "${cat.name}" (${cat.number_range_start}–${cat.number_range_end})`);
    }
  }
}

export const create_event_category = spacetimedb.reducer(
  { event_id: t.u64(), name: t.string(), description: t.string(), number_range_start: t.u32(), number_range_end: t.u32() },
  (ctx, args) => {
    requireEventOrganizer(ctx, args.event_id);
    if (!args.name.trim()) throw new SenderError('Category name is required');
    if (args.number_range_start > args.number_range_end) throw new SenderError('Range start must be <= range end');
    checkCategoryRangeOverlap(ctx, args.event_id, args.number_range_start, args.number_range_end, null);
    ctx.db.event_category.insert({
      id: 0n,
      event_id: args.event_id,
      name: args.name.trim(),
      description: args.description.trim(),
      number_range_start: args.number_range_start,
      number_range_end: args.number_range_end,
    });
  }
);

export const update_event_category = spacetimedb.reducer(
  { category_id: t.u64(), name: t.string(), description: t.string(), number_range_start: t.u32(), number_range_end: t.u32() },
  (ctx, args) => {
    const cat = ctx.db.event_category.id.find(args.category_id);
    if (!cat) throw new SenderError('Category not found');
    requireEventOrganizer(ctx, cat.event_id);
    if (!args.name.trim()) throw new SenderError('Category name is required');
    if (args.number_range_start > args.number_range_end) throw new SenderError('Range start must be <= range end');
    checkCategoryRangeOverlap(ctx, cat.event_id, args.number_range_start, args.number_range_end, cat.id);
    ctx.db.event_category.id.update({
      ...cat,
      name: args.name.trim(),
      description: args.description.trim(),
      number_range_start: args.number_range_start,
      number_range_end: args.number_range_end,
    });
  }
);

export const delete_event_category = spacetimedb.reducer(
  { category_id: t.u64() },
  (ctx, args) => {
    const cat = ctx.db.event_category.id.find(args.category_id);
    if (!cat) throw new SenderError('Category not found');
    requireEventOrganizer(ctx, cat.event_id);
    for (const ct of ctx.db.category_track.iter()) {
      if (ct.category_id === cat.id) ctx.db.category_track.id.delete(ct.id);
    }
    ctx.db.event_category.id.delete(cat.id);
  }
);

export const add_track_to_category = spacetimedb.reducer(
  { category_id: t.u64(), event_track_id: t.u64() },
  (ctx, args) => {
    const cat = ctx.db.event_category.id.find(args.category_id);
    if (!cat) throw new SenderError('Category not found');
    requireEventOrganizer(ctx, cat.event_id);
    const et = ctx.db.event_track.id.find(args.event_track_id);
    if (!et) throw new SenderError('Event track not found');
    if (et.event_id !== cat.event_id) throw new SenderError('Event track must belong to the same event as the category');
    for (const ct of ctx.db.category_track.iter()) {
      if (ct.category_id === cat.id && ct.event_track_id === args.event_track_id) {
        throw new SenderError('Track already assigned to this category');
      }
    }
    ctx.db.category_track.insert({ id: 0n, category_id: cat.id, event_track_id: args.event_track_id });
  }
);

export const remove_track_from_category = spacetimedb.reducer(
  { category_track_id: t.u64() },
  (ctx, args) => {
    const ct = ctx.db.category_track.id.find(args.category_track_id);
    if (!ct) throw new SenderError('Category track not found');
    const cat = ctx.db.event_category.id.find(ct.category_id);
    if (!cat) throw new SenderError('Category not found');
    requireEventOrganizer(ctx, cat.event_id);
    ctx.db.category_track.id.delete(ct.id);
  }
);

export const import_categories_from_event = spacetimedb.reducer(
  { target_event_id: t.u64(), source_event_id: t.u64() },
  (ctx, args) => {
    requireEventOrganizer(ctx, args.target_event_id);
    // Collect source categories first, then validate all ranges before inserting
    const toImport: { name: string; description: string; number_range_start: number; number_range_end: number }[] = [];
    for (const cat of ctx.db.event_category.iter()) {
      if (cat.event_id === args.source_event_id) {
        toImport.push({ name: cat.name, description: cat.description, number_range_start: cat.number_range_start, number_range_end: cat.number_range_end });
      }
    }
    // Check each imported category against existing ones in the target event
    for (const imp of toImport) {
      checkCategoryRangeOverlap(ctx, args.target_event_id, imp.number_range_start, imp.number_range_end, null);
    }
    for (const imp of toImport) {
      ctx.db.event_category.insert({
        id: 0n,
        event_id: args.target_event_id,
        name: imp.name,
        description: imp.description,
        number_range_start: imp.number_range_start,
        number_range_end: imp.number_range_end,
      });
    }
  }
);

// ─── Event-Rider linking (event organizer+) ─────────────────────────────────

export const add_rider_to_event = spacetimedb.reducer(
  { event_id: t.u64(), rider_id: t.u64() },
  (ctx, args) => {
    requireEventOrganizer(ctx, args.event_id);
    // Prevent duplicates
    for (const er of ctx.db.event_rider.iter()) {
      if (er.event_id === args.event_id && er.rider_id === args.rider_id) {
        throw new SenderError('Rider already assigned to this event');
      }
    }
    ctx.db.event_rider.insert({ id: 0n, event_id: args.event_id, rider_id: args.rider_id, category_id: 0n, checked_in: false, assigned_number: 0 });
  }
);

export const update_event_rider = spacetimedb.reducer(
  { event_rider_id: t.u64(), category_id: t.u64(), checked_in: t.bool(), assigned_number: t.u32() },
  (ctx, args) => {
    const er = ctx.db.event_rider.id.find(args.event_rider_id);
    if (!er) throw new SenderError('Event rider not found');
    requireEventOrganizer(ctx, er.event_id);
    // Validate category belongs to this event (0 = no category)
    if (args.category_id !== 0n) {
      const cat = ctx.db.event_category.id.find(args.category_id);
      if (!cat || cat.event_id !== er.event_id) throw new SenderError('Invalid category for this event');
    }
    ctx.db.event_rider.id.update({ ...er, category_id: args.category_id, checked_in: args.checked_in, assigned_number: args.assigned_number });
  }
);

export const import_riders_from_event = spacetimedb.reducer(
  { target_event_id: t.u64(), source_event_id: t.u64() },
  (ctx, args) => {
    requireEventOrganizer(ctx, args.target_event_id);
    const existing = new Set<bigint>();
    for (const er of ctx.db.event_rider.iter()) {
      if (er.event_id === args.target_event_id) existing.add(er.rider_id);
    }
    for (const er of ctx.db.event_rider.iter()) {
      if (er.event_id === args.source_event_id && !existing.has(er.rider_id)) {
        ctx.db.event_rider.insert({ id: 0n, event_id: args.target_event_id, rider_id: er.rider_id, category_id: 0n, checked_in: false, assigned_number: 0 });
        existing.add(er.rider_id);
      }
    }
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

// Parse YYYY-MM-DD to start of day (ms UTC)
function parseEventDateStart(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.getTime();
}

// Parse YYYY-MM-DD to end of day (ms UTC)
function parseEventDateEnd(dateStr: string): number {
  const d = new Date(dateStr + 'T23:59:59.999Z');
  return d.getTime();
}

export const generate_track_schedule = spacetimedb.reducer(
  { event_track_id: t.u64(), start_time: t.u64(), interval_seconds: t.u32() },
  (ctx, args) => {
    const et = ctx.db.event_track.id.find(args.event_track_id);
    if (!et) throw new SenderError('Event track not found');
    const eventId = et.event_id;
    requireEventOrganizer(ctx, eventId);

    const evt = ctx.db.event.id.find(eventId);
    if (!evt) throw new SenderError('Event not found');

    const minTime = parseEventDateStart(evt.start_date);
    const maxTime = parseEventDateEnd(evt.end_date);
    const startMs = Number(args.start_time);
    if (startMs < minTime || startMs > maxTime) {
      throw new SenderError(`Start time must be within event dates ${evt.start_date} to ${evt.end_date}`);
    }

    if (args.interval_seconds < 1) throw new SenderError('Interval must be at least 1 second');

    // Remove existing runs for this track
    for (const run of ctx.db.run.iter()) {
      if (run.event_track_id === args.event_track_id) {
        ctx.db.run.id.delete(run.id);
      }
    }

    // Upsert schedule config
    let existing = null;
    for (const s of ctx.db.event_track_schedule.iter()) {
      if (s.event_track_id === args.event_track_id) {
        existing = s;
        break;
      }
    }
    if (existing) {
      ctx.db.event_track_schedule.id.update({
        ...existing,
        start_time: args.start_time,
        interval_seconds: args.interval_seconds,
      });
    } else {
      ctx.db.event_track_schedule.insert({
        id: 0n,
        event_track_id: args.event_track_id,
        start_time: args.start_time,
        interval_seconds: args.interval_seconds,
      });
    }

    // Get all registered riders for this event, ordered by category, assigned_number, name
    const eventRiders: { rider_id: bigint; category_id: bigint; assigned_number: number; sort_name: string }[] = [];
    for (const er of ctx.db.event_rider.iter()) {
      if (er.event_id !== eventId) continue;
      const cat = er.category_id !== 0n ? ctx.db.event_category.id.find(er.category_id) : null;
      const rider = ctx.db.rider.id.find(er.rider_id);
      const num = er.assigned_number !== 0 ? er.assigned_number : (cat ? cat.number_range_start : 9999);
      const sortName = rider ? `${rider.last_name} ${rider.first_name}` : '';
      eventRiders.push({
        rider_id: er.rider_id,
        category_id: er.category_id,
        assigned_number: num,
        sort_name: sortName,
      });
    }

    // Sort: by category (categories first), then by assigned number, then by name
    const categoryMap = new Map<bigint, number>();
    let catOrder = 0;
    for (const cat of ctx.db.event_category.iter()) {
      if (cat.event_id === eventId) {
        categoryMap.set(cat.id, catOrder++);
      }
    }
    eventRiders.sort((a, b) => {
      const aCat = categoryMap.get(a.category_id) ?? 9999;
      const bCat = categoryMap.get(b.category_id) ?? 9999;
      if (aCat !== bCat) return aCat - bCat;
      if (a.assigned_number !== b.assigned_number) return a.assigned_number - b.assigned_number;
      return a.sort_name.localeCompare(b.sort_name);
    });

    let sortOrder = 1;
    for (const er of eventRiders) {
      ctx.db.run.insert({
        id: 0n,
        event_track_id: args.event_track_id,
        rider_id: er.rider_id,
        sort_order: sortOrder++,
        status: 'queued',
        start_time: 0n,
        end_time: 0n,
      });
    }
  }
);

export const clear_track_schedule = spacetimedb.reducer(
  { event_track_id: t.u64() },
  (ctx, args) => {
    const eventId = getEventIdFromEventTrack(ctx, args.event_track_id);
    requireEventOrganizer(ctx, eventId);

    for (const run of ctx.db.run.iter()) {
      if (run.event_track_id === args.event_track_id) {
        ctx.db.run.id.delete(run.id);
      }
    }

    for (const s of ctx.db.event_track_schedule.iter()) {
      if (s.event_track_id === args.event_track_id) {
        ctx.db.event_track_schedule.id.delete(s.id);
        break;
      }
    }
  }
);

// ─── Clock sync ─────────────────────────────────────────────────────────────

export const get_server_time = spacetimedb.reducer(
  { request_id: t.u64() },
  (ctx, args) => {
    const now = BigInt(Date.now());
    // Upsert: find existing row for this identity
    let existing = null;
    for (const row of ctx.db.server_time_response.iter()) {
      if (row.identity.isEqual(ctx.sender)) { existing = row; break; }
    }
    if (existing) {
      ctx.db.server_time_response.id.update({ ...existing, server_time: now, request_id: args.request_id });
    } else {
      ctx.db.server_time_response.insert({ id: 0n, identity: ctx.sender, server_time: now, request_id: args.request_id });
    }
  }
);

// ─── Impersonation (super_admin only) ────────────────────────────────────────

export const start_impersonation = spacetimedb.reducer(
  { target_user_id: t.u64() },
  (ctx, args) => {
    const realUser = getRealUser(ctx);
    if (!realUser) throw new SenderError('Not authenticated');

    const target = ctx.db.user.id.find(args.target_user_id);
    if (!target) throw new SenderError('Target user not found');
    if (target.id === realUser.id) throw new SenderError('Cannot impersonate yourself');

    let orgId = 0n; // 0 = super_admin, unrestricted

    if (!realUser.is_super_admin) {
      // Org admin: find a shared org where caller is admin and target is a member
      let sharedOrgId: bigint | null = null;

      for (const om of ctx.db.org_member.iter()) {
        if (om.user_id !== realUser.id) continue;
        const callerRole = getOrgRole(ctx, realUser.id, om.org_id);
        if (callerRole !== 'admin') continue;

        // Target must not be an admin in this org
        const targetRole = getOrgRole(ctx, target.id, om.org_id);
        if (targetRole === 'admin') continue;

        // Check target is in this org (org member, event member, or org owner)
        if (isOrgOwner(ctx, target.id, om.org_id)) { sharedOrgId = om.org_id; break; }
        if (targetRole) { sharedOrgId = om.org_id; break; }

        // Check event members within this org
        let found = false;
        for (const evt of ctx.db.event.iter()) {
          if (evt.org_id !== om.org_id) continue;
          for (const em of ctx.db.event_member.iter()) {
            if (em.event_id === evt.id && em.user_id === target.id) { found = true; break; }
          }
          if (found) break;
        }
        if (found) { sharedOrgId = om.org_id; break; }
      }

      // Also check if caller is org owner
      if (!sharedOrgId) {
        for (const org of ctx.db.organization.iter()) {
          if (org.owner_user_id !== realUser.id) continue;
          const targetRole = getOrgRole(ctx, target.id, org.id);
          if (targetRole === 'admin') continue;
          // Check target is associated with this org
          if (targetRole) { sharedOrgId = org.id; break; }
          let found = false;
          for (const evt of ctx.db.event.iter()) {
            if (evt.org_id !== org.id) continue;
            for (const em of ctx.db.event_member.iter()) {
              if (em.event_id === evt.id && em.user_id === target.id) { found = true; break; }
            }
            if (found) break;
          }
          if (found) { sharedOrgId = org.id; break; }
        }
      }

      if (!sharedOrgId) throw new SenderError('Cannot impersonate this user — they are not in your organization');
      orgId = sharedOrgId;
    }

    // Upsert: remove existing impersonation for this admin
    for (const imp of ctx.db.impersonation.iter()) {
      if (imp.admin_identity.isEqual(ctx.sender)) {
        ctx.db.impersonation.id.delete(imp.id);
        break;
      }
    }
    for (const st of ctx.db.impersonation_status.iter()) {
      if (st.admin_identity.isEqual(ctx.sender)) {
        ctx.db.impersonation_status.id.delete(st.id);
        break;
      }
    }

    ctx.db.impersonation.insert({ id: 0n, admin_identity: ctx.sender, target_user_id: target.id, org_id: orgId });
    ctx.db.impersonation_status.insert({ id: 0n, admin_identity: ctx.sender, target_user_id: target.id, target_user_name: target.name || target.email, org_id: orgId });
  }
);

export const stop_impersonation = spacetimedb.reducer(
  {},
  (ctx) => {
    for (const imp of ctx.db.impersonation.iter()) {
      if (imp.admin_identity.isEqual(ctx.sender)) {
        ctx.db.impersonation.id.delete(imp.id);
        break;
      }
    }
    for (const st of ctx.db.impersonation_status.iter()) {
      if (st.admin_identity.isEqual(ctx.sender)) {
        ctx.db.impersonation_status.id.delete(st.id);
        break;
      }
    }
  }
);

// ─── Timekeeper assignments (event organizer+) ─────────────────────────────

// start_user_id / end_user_id: 0 = unassigned
export const set_track_timekeepers = spacetimedb.reducer(
  { event_track_id: t.u64(), start_user_id: t.u64(), end_user_id: t.u64() },
  (ctx, args) => {
    const eventId = getEventIdFromEventTrack(ctx, args.event_track_id);
    requireEventOrganizer(ctx, eventId);
    // Clear existing
    for (const a of ctx.db.timekeeper_assignment.iter()) {
      if (a.event_track_id === args.event_track_id) ctx.db.timekeeper_assignment.id.delete(a.id);
    }
    // Insert new
    if (args.start_user_id !== 0n && args.end_user_id !== 0n && args.start_user_id === args.end_user_id) {
      ctx.db.timekeeper_assignment.insert({ id: 0n, event_track_id: args.event_track_id, user_id: args.start_user_id, position: 'both' });
    } else {
      if (args.start_user_id !== 0n) {
        ctx.db.timekeeper_assignment.insert({ id: 0n, event_track_id: args.event_track_id, user_id: args.start_user_id, position: 'start' });
      }
      if (args.end_user_id !== 0n) {
        ctx.db.timekeeper_assignment.insert({ id: 0n, event_track_id: args.event_track_id, user_id: args.end_user_id, position: 'end' });
      }
    }
  }
);

// ─── Timekeeping (timekeeper+) ──────────────────────────────────────────────

// Validates a client-supplied timestamp: must be within 10s of server time.
// Returns the client time if valid, otherwise falls back to server time.
function resolveClientTime(clientTime: bigint): bigint {
  const serverNow = BigInt(Date.now());
  if (clientTime === 0n) return serverNow;
  const diff = serverNow > clientTime ? serverNow - clientTime : clientTime - serverNow;
  if (diff > 10000n) return serverNow; // >10s drift, ignore client time
  return clientTime;
}

export const start_run = spacetimedb.reducer(
  { run_id: t.u64(), client_time: t.u64() },
  (ctx, { run_id, client_time }) => {
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
      start_time: resolveClientTime(client_time),
      end_time: 0n,
    });
  }
);

export const finish_run = spacetimedb.reducer(
  { run_id: t.u64(), client_time: t.u64() },
  (ctx, { run_id, client_time }) => {
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
      end_time: resolveClientTime(client_time),
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

export const dns_run = spacetimedb.reducer(
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
      status: 'dns',
      start_time: 0n,
      end_time: 0n,
    });
  }
);

// ─── Images ─────────────────────────────────────────────────────────────────

// Resolve entity to its venue's org_id for permission checks
function getEntityOrgId(ctx: any, entityType: string, entityId: bigint): bigint {
  if (entityType === 'venue') {
    const venue = ctx.db.venue.id.find(entityId);
    if (!venue) throw new SenderError('Venue not found');
    return venue.org_id;
  }
  if (entityType === 'track') {
    const track = ctx.db.track.id.find(entityId);
    if (!track) throw new SenderError('Track not found');
    const venue = ctx.db.venue.id.find(track.venue_id);
    if (!venue) throw new SenderError('Venue not found');
    return venue.org_id;
  }
  if (entityType === 'track_variation') {
    const tv = ctx.db.track_variation.id.find(entityId);
    if (!tv) throw new SenderError('Track variation not found');
    const track = ctx.db.track.id.find(tv.track_id);
    if (!track) throw new SenderError('Track not found');
    const venue = ctx.db.venue.id.find(track.venue_id);
    if (!venue) throw new SenderError('Venue not found');
    return venue.org_id;
  }
  throw new SenderError('Invalid entity type');
}

export const add_image = spacetimedb.reducer(
  { entity_type: t.string(), entity_id: t.u64(), data: t.string(), caption: t.string() },
  (ctx, args) => {
    const orgId = getEntityOrgId(ctx, args.entity_type, args.entity_id);
    requireOrgEventManager(ctx, orgId);
    // Determine sort_order
    let maxOrder = 0;
    for (const img of ctx.db.image.iter()) {
      if (img.entity_type === args.entity_type && img.entity_id === args.entity_id) {
        if (img.sort_order >= maxOrder) maxOrder = img.sort_order + 1;
      }
    }
    ctx.db.image.insert({ id: 0n, entity_type: args.entity_type, entity_id: args.entity_id, data: args.data, caption: args.caption, sort_order: maxOrder });
  }
);

export const delete_image = spacetimedb.reducer(
  { image_id: t.u64() },
  (ctx, args) => {
    const img = ctx.db.image.id.find(args.image_id);
    if (!img) throw new SenderError('Image not found');
    const orgId = getEntityOrgId(ctx, img.entity_type, img.entity_id);
    requireOrgEventManager(ctx, orgId);
    ctx.db.image.id.delete(img.id);
  }
);

export const update_image_caption = spacetimedb.reducer(
  { image_id: t.u64(), caption: t.string() },
  (ctx, args) => {
    const img = ctx.db.image.id.find(args.image_id);
    if (!img) throw new SenderError('Image not found');
    const orgId = getEntityOrgId(ctx, img.entity_type, img.entity_id);
    requireOrgEventManager(ctx, orgId);
    ctx.db.image.id.update({ ...img, caption: args.caption });
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
      org = ctx.db.organization.insert({ id: 0n, name: orgName, slug: uniqueOrgSlug(ctx, slugify(orgName)), owner_user_id: ownerId });
    }

    // Championships
    const champ1 = ctx.db.championship.insert({ id: 0n, org_id: org.id, name: 'Enduro Series 2025', description: 'Regional enduro mountain bike series', color: '#3b82f6' });
    const champ2 = ctx.db.championship.insert({ id: 0n, org_id: org.id, name: 'Downhill Cup 2025', description: 'Gravity-focused downhill racing', color: '#ef4444' });
    const champ3 = ctx.db.championship.insert({ id: 0n, org_id: org.id, name: 'XC Marathon Series', description: 'Cross-country endurance events', color: '#22c55e' });

    // Venues
    const venue1 = ctx.db.venue.insert({ id: 0n, org_id: org.id, name: 'Pine Mountain Bike Park', description: 'Technical enduro trails in the Blue Ridge', address: '1234 Mountain Rd, Blue Ridge, VA 24064' });
    const venue2 = ctx.db.venue.insert({ id: 0n, org_id: org.id, name: 'Eagle Rock Resort', description: 'Steep downhill runs with jumps', address: '5678 Eagle Rock Dr, Hazleton, PA 18202' });
    const venue3 = ctx.db.venue.insert({ id: 0n, org_id: org.id, name: 'Lakeside Trails', description: 'Rolling singletrack around the lake', address: '910 Lakeshore Blvd, Asheville, NC 28801' });

    // Tracks & variations
    const track1 = ctx.db.track.insert({ id: 0n, venue_id: venue1.id, name: 'Widow Maker', color: '#ef4444' });
    const tv1 = ctx.db.track_variation.insert({ id: 0n, track_id: track1.id, name: 'Full Send', description: 'Top-to-bottom with rock gardens and drops', start_latitude: 38.900, start_longitude: -77.040, end_latitude: 38.895, end_longitude: -77.035 });
    ctx.db.track_variation.insert({ id: 0n, track_id: track1.id, name: 'Default', description: 'Standard route', start_latitude: 38.8977, start_longitude: -77.0365, end_latitude: 38.895, end_longitude: -77.035 });
    const track2 = ctx.db.track.insert({ id: 0n, venue_id: venue1.id, name: 'Rock Garden', color: '#22c55e' });
    const tv2 = ctx.db.track_variation.insert({ id: 0n, track_id: track2.id, name: 'Default', description: 'Technical rock garden descent', start_latitude: 38.899, start_longitude: -77.038, end_latitude: 38.894, end_longitude: -77.033 });
    const track3 = ctx.db.track.insert({ id: 0n, venue_id: venue2.id, name: 'Thunderbolt', color: '#3b82f6' });
    const tv3 = ctx.db.track_variation.insert({ id: 0n, track_id: track3.id, name: 'Race Line', description: 'Fast downhill with gap jumps', start_latitude: 40.920, start_longitude: -76.048, end_latitude: 40.915, end_longitude: -76.043 });
    ctx.db.track_variation.insert({ id: 0n, track_id: track3.id, name: 'Default', description: 'Standard route', start_latitude: 40.9176, start_longitude: -76.0452, end_latitude: 40.915, end_longitude: -76.043 });
    const track4 = ctx.db.track.insert({ id: 0n, venue_id: venue3.id, name: 'Lakeshore Loop', color: '#eab308' });
    const tv4 = ctx.db.track_variation.insert({ id: 0n, track_id: track4.id, name: 'Full Loop', description: '25km singletrack loop', start_latitude: 35.598, start_longitude: -82.554, end_latitude: 35.595, end_longitude: -82.551 });
    ctx.db.track_variation.insert({ id: 0n, track_id: track4.id, name: 'Default', description: 'Standard route', start_latitude: 35.5951, start_longitude: -82.5515, end_latitude: 35.595, end_longitude: -82.551 });

    const insertEvent = (champId: bigint, venueId: bigint, name: string, desc: string, start: string, end: string) =>
      ctx.db.event.insert({ id: 0n, org_id: org.id, championship_id: champId, venue_id: venueId, name, slug: uniqueEventSlug(ctx, org.id, slugify(name)), description: desc, start_date: start, end_date: end });

    // Enduro Series events
    const evt1 = insertEvent(champ1.id, venue1.id, 'Enduro R1 - Pine Mountain', 'Opening round', '2025-03-15', '2025-03-16');
    const evt2 = insertEvent(champ1.id, venue2.id, 'Enduro R2 - Eagle Rock', 'Second round', '2025-05-10', '2025-05-11');
    const evt3 = insertEvent(champ1.id, venue3.id, 'Enduro R3 - Lakeside', 'Season finale', '2025-07-19', '2025-07-20');
    const evtUpcoming = insertEvent(champ1.id, venue1.id, 'Enduro R4 - Pine Mountain', 'Upcoming round (not started yet)', '2029-09-20', '2029-09-21');

    // Downhill Cup events
    const evt4 = insertEvent(champ2.id, venue2.id, 'DH Cup R1 - Eagle Rock', 'Downhill opener', '2025-04-05', '2025-04-06');
    const evt5 = insertEvent(champ2.id, venue1.id, 'DH Cup R2 - Pine Mountain', 'Mid-season round', '2025-06-14', '2025-06-15');

    // XC Marathon events
    const evt6 = insertEvent(champ3.id, venue3.id, 'XC Marathon R1 - Lakeside', 'Endurance opener', '2025-04-26', '2025-04-27');
    const evt7 = insertEvent(champ3.id, venue1.id, 'XC Marathon R2 - Pine Mountain', 'Mountain stage', '2025-08-09', '2025-08-10');

    // Event tracks
    const et1 = ctx.db.event_track.insert({ id: 0n, event_id: evt1.id, track_variation_id: tv1.id, sort_order: 1 });
    const et2 = ctx.db.event_track.insert({ id: 0n, event_id: evt1.id, track_variation_id: tv2.id, sort_order: 2 });
    ctx.db.event_track.insert({ id: 0n, event_id: evt2.id, track_variation_id: tv3.id, sort_order: 1 });
    ctx.db.event_track.insert({ id: 0n, event_id: evt3.id, track_variation_id: tv4.id, sort_order: 1 });
    ctx.db.event_track.insert({ id: 0n, event_id: evt4.id, track_variation_id: tv3.id, sort_order: 1 });
    ctx.db.event_track.insert({ id: 0n, event_id: evt5.id, track_variation_id: tv1.id, sort_order: 1 });
    ctx.db.event_track.insert({ id: 0n, event_id: evt6.id, track_variation_id: tv4.id, sort_order: 1 });
    ctx.db.event_track.insert({ id: 0n, event_id: evt7.id, track_variation_id: tv1.id, sort_order: 1 });
    ctx.db.event_track.insert({ id: 0n, event_id: evtUpcoming.id, track_variation_id: tv1.id, sort_order: 1 });

    // Riders
    const ridersData = [
      { first_name: 'Alex', last_name: 'Morgan', email: 'alex@example.com', phone: '+1-555-0101', date_of_birth: '1997-03-14' },
      { first_name: 'Sam', last_name: 'Rivera', email: 'sam@example.com', phone: '+1-555-0102', date_of_birth: '2001-07-22' },
      { first_name: 'Jordan', last_name: 'Chen', email: 'jordan@example.com', phone: '+1-555-0103', date_of_birth: '1994-11-05' },
      { first_name: 'Casey', last_name: 'Brooks', email: 'casey@example.com', phone: '+1-555-0104', date_of_birth: '1999-01-30' },
      { first_name: 'Taylor', last_name: 'Kim', email: 'taylor@example.com', phone: '+1-555-0105', date_of_birth: '1996-08-12' },
      { first_name: 'Riley', last_name: 'Santos', email: 'riley@example.com', phone: '+1-555-0106', date_of_birth: '2000-02-28' },
    ];

    const riders = ridersData.map((r) => {
      return ctx.db.rider.insert({ id: 0n, org_id: org.id, first_name: r.first_name, last_name: r.last_name, email: r.email, phone: r.phone, date_of_birth: r.date_of_birth });
    });

    // Register first 4 riders for event 1
    for (let i = 0; i < 4; i++) {
      ctx.db.event_rider.insert({ id: 0n, event_id: evt1.id, rider_id: riders[i].id, category_id: 0n, checked_in: false, assigned_number: 0 });
    }

    // Queue runs for first event's tracks
    for (const etId of [et1.id, et2.id]) {
      let order = 1;
      for (let i = 0; i < 4; i++) {
        ctx.db.run.insert({
          id: 0n,
          event_track_id: etId,
          rider_id: riders[i].id,
          sort_order: order++,
          status: 'queued',
          start_time: 0n,
          end_time: 0n,
        });
      }
    }

    // ─── Enduro R4 - Pine Mountain: categories, riders, event tracks ─────

    const etR4_1 = ctx.db.event_track.id.find(
      // already inserted above for evtUpcoming with tv1
      (() => { for (const et of ctx.db.event_track.iter()) { if (et.event_id === evtUpcoming.id && et.track_variation_id === tv1.id) return et.id; } return 0n; })()
    )!;
    const etR4_2 = ctx.db.event_track.insert({ id: 0n, event_id: evtUpcoming.id, track_variation_id: tv2.id, sort_order: 2 });

    // Categories
    const catElite = ctx.db.event_category.insert({ id: 0n, event_id: evtUpcoming.id, name: 'Elite', description: 'Pro and semi-pro riders', number_range_start: 1, number_range_end: 50 });
    const catSport = ctx.db.event_category.insert({ id: 0n, event_id: evtUpcoming.id, name: 'Sport', description: 'Intermediate competitive riders', number_range_start: 51, number_range_end: 100 });
    const catBeginner = ctx.db.event_category.insert({ id: 0n, event_id: evtUpcoming.id, name: 'Beginner', description: 'First-time riders welcome', number_range_start: 101, number_range_end: 150 });

    // Assign tracks to categories
    ctx.db.category_track.insert({ id: 0n, category_id: catElite.id, event_track_id: etR4_1!.id });
    ctx.db.category_track.insert({ id: 0n, category_id: catElite.id, event_track_id: etR4_2.id });
    ctx.db.category_track.insert({ id: 0n, category_id: catSport.id, event_track_id: etR4_1!.id });
    ctx.db.category_track.insert({ id: 0n, category_id: catSport.id, event_track_id: etR4_2.id });
    ctx.db.category_track.insert({ id: 0n, category_id: catBeginner.id, event_track_id: etR4_1!.id });

    // Register all 6 riders for R4 with categories and assigned numbers
    ctx.db.event_rider.insert({ id: 0n, event_id: evtUpcoming.id, rider_id: riders[0].id, category_id: catElite.id, checked_in: false, assigned_number: 1 });
    ctx.db.event_rider.insert({ id: 0n, event_id: evtUpcoming.id, rider_id: riders[1].id, category_id: catElite.id, checked_in: false, assigned_number: 2 });
    ctx.db.event_rider.insert({ id: 0n, event_id: evtUpcoming.id, rider_id: riders[2].id, category_id: catSport.id, checked_in: false, assigned_number: 51 });
    ctx.db.event_rider.insert({ id: 0n, event_id: evtUpcoming.id, rider_id: riders[3].id, category_id: catSport.id, checked_in: false, assigned_number: 52 });
    ctx.db.event_rider.insert({ id: 0n, event_id: evtUpcoming.id, rider_id: riders[4].id, category_id: catBeginner.id, checked_in: false, assigned_number: 101 });
    ctx.db.event_rider.insert({ id: 0n, event_id: evtUpcoming.id, rider_id: riders[5].id, category_id: catBeginner.id, checked_in: false, assigned_number: 102 });

    // ─── Pending org members ─────────────────────────────────────────────

    const pendingData = [
      { email: 'pending-manager@example.com', name: 'Pending Manager', role: 'manager' },
      { email: 'pending-admin@example.com', name: 'Pending Admin', role: 'admin' },
      { email: 'pending-timekeeper@example.com', name: 'Pending Timekeeper', role: 'timekeeper' },
    ];
    for (const p of pendingData) {
      let existing = null;
      for (const u of ctx.db.user.iter()) {
        if (u.email === p.email) { existing = u; break; }
      }
      const userId = existing ? existing.id : ctx.db.user.insert({
        id: 0n,
        identity: placeholderIdentity(p.email),
        google_sub: `pending:${p.email}`,
        email: p.email,
        name: p.name,
        picture: '',
        is_super_admin: false,
      }).id;
      let alreadyMember = false;
      for (const m of ctx.db.org_member.iter()) {
        if (m.org_id === org.id && m.user_id === userId) { alreadyMember = true; break; }
      }
      if (!alreadyMember) {
        ctx.db.org_member.insert({ id: 0n, org_id: org.id, user_id: userId, role: p.role });
      }
      // Assign timekeeper to R4 tracks
      if (p.role === 'timekeeper') {
        ctx.db.timekeeper_assignment.insert({ id: 0n, event_track_id: etR4_1!.id, user_id: userId, position: 'start' });
        ctx.db.timekeeper_assignment.insert({ id: 0n, event_track_id: etR4_2.id, user_id: userId, position: 'end' });
      }
    }
  }
);

// ─── Dev tools (no auth) ─────────────────────────────────────────────────

export const wipe_all_data = spacetimedb.reducer((ctx) => {
  const tables = [
    ctx.db.run, ctx.db.event_track_schedule, ctx.db.category_track,
    ctx.db.event_category, ctx.db.event_rider, ctx.db.event_track,
    ctx.db.timekeeper_assignment,
    ctx.db.event, ctx.db.championship, ctx.db.track_variation,
    ctx.db.track, ctx.db.venue, ctx.db.rider, ctx.db.registration_token,
    ctx.db.pinned_event, ctx.db.event_member, ctx.db.org_member,
    ctx.db.image, ctx.db.impersonation, ctx.db.impersonation_status,
    ctx.db.server_time_response, ctx.db.organization, ctx.db.user,
  ];
  for (const tbl of tables) {
    for (const row of tbl.iter()) tbl.id.delete(row.id);
  }
});

export const transfer_org_ownership_by_email = spacetimedb.reducer(
  { org_id: t.u64(), email: t.string() },
  (ctx, args) => {
    const org = ctx.db.organization.id.find(args.org_id);
    if (!org) throw new SenderError('Organization not found');
    const trimmedEmail = args.email.trim().toLowerCase();
    let targetUser = null;
    for (const u of ctx.db.user.iter()) {
      if (u.email === trimmedEmail) { targetUser = u; break; }
    }
    if (!targetUser) throw new SenderError('User not found with that email');
    if (org.owner_user_id === targetUser.id) throw new SenderError('User is already the owner');
    ctx.db.organization.id.update({ ...org, owner_user_id: targetUser.id });
    let member = null;
    for (const m of ctx.db.org_member.iter()) {
      if (m.org_id === args.org_id && m.user_id === targetUser.id) { member = m; break; }
    }
    if (member) {
      if (member.role !== 'admin') ctx.db.org_member.id.update({ ...member, role: 'admin' });
    } else {
      ctx.db.org_member.insert({ id: 0n, org_id: args.org_id, user_id: targetUser.id, role: 'admin' });
    }
  }
);
