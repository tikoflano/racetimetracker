import { SenderError } from 'spacetimedb/server';
import type { Ctx } from '../schema';

// ─── Slug helpers (ctx-dependent) ───────────────────────────────────────────

export function uniqueOrgSlug(ctx: Ctx, base: string): string {
  let candidate = base;
  let n = 1;
  while (true) {
    let taken = false;
    for (const o of ctx.db.organization.iter()) {
      if (o.slug === candidate) {
        taken = true;
        break;
      }
    }
    if (!taken) return candidate;
    candidate = `${base}-${++n}`;
  }
}

export function uniqueEventSlug(ctx: Ctx, orgId: bigint, base: string, excludeId?: bigint): string {
  let candidate = base;
  let n = 1;
  while (true) {
    let taken = false;
    for (const e of ctx.db.event.iter()) {
      if (e.org_id === orgId && e.slug === candidate && e.id !== excludeId) {
        taken = true;
        break;
      }
    }
    if (!taken) return candidate;
    candidate = `${base}-${++n}`;
  }
}

export function generateUniqueOrgName(ctx: Ctx, baseName: string): string {
  let candidate = baseName;
  let attempt = 0;
  while (true) {
    let taken = false;
    for (const o of ctx.db.organization.iter()) {
      if (o.name === candidate) {
        taken = true;
        break;
      }
    }
    if (!taken) return candidate;
    attempt++;
    candidate = `${baseName} ${attempt}`;
  }
}

// ─── Auth helpers ───────────────────────────────────────────────────────────

export function getRealUser(ctx: Ctx) {
  for (const u of ctx.db.user.iter()) {
    if (u.identity.isEqual(ctx.sender)) return u;
  }
  return null;
}

export function getUser(ctx: Ctx) {
  for (const imp of ctx.db.impersonation.iter()) {
    if (imp.admin_identity.isEqual(ctx.sender)) {
      const target = ctx.db.user.id.find(imp.target_user_id);
      if (target) return target;
    }
  }
  return getRealUser(ctx);
}

export function requireUser(ctx: Ctx) {
  const user = getUser(ctx);
  if (!user) throw new SenderError('Not authenticated');
  return user;
}

export function requireSuperAdmin(ctx: Ctx) {
  const user = getRealUser(ctx);
  if (!user || !user.is_super_admin) throw new SenderError('Super admin access required');
  return user;
}

export function isOrgOwner(ctx: Ctx, userId: bigint, orgId: bigint): boolean {
  const org = ctx.db.organization.id.find(orgId);
  return org !== null && org.owner_user_id === userId;
}

export function getOrgRole(ctx: Ctx, userId: bigint, orgId: bigint): string | null {
  if (isOrgOwner(ctx, userId, orgId)) return 'admin';
  for (const m of ctx.db.org_member.iter()) {
    if (m.user_id === userId && m.org_id === orgId) return m.role;
  }
  return null;
}

export function getChampionshipRole(ctx: Ctx, userId: bigint, championshipId: bigint): string | null {
  for (const m of ctx.db.championship_member.iter()) {
    if (m.user_id === userId && m.championship_id === championshipId) return m.role;
  }
  return null;
}

export function getEventRole(ctx: Ctx, userId: bigint, eventId: bigint): string | null {
  for (const m of ctx.db.event_member.iter()) {
    if (m.user_id === userId && m.event_id === eventId) return m.role;
  }
  return null;
}

export function requireOrgAdmin(ctx: Ctx, orgId: bigint) {
  const user = requireUser(ctx);
  if (user.is_super_admin) return user;
  const role = getOrgRole(ctx, user.id, orgId);
  if (role !== 'admin') throw new SenderError('Org admin access required');
  return user;
}

export function requireOrgOwner(ctx: Ctx, orgId: bigint) {
  const user = requireUser(ctx);
  if (user.is_super_admin) return user;
  if (!isOrgOwner(ctx, user.id, orgId))
    throw new SenderError('Only the org owner can transfer ownership');
  return user;
}

export function requireOrgEventManager(ctx: Ctx, orgId: bigint) {
  const user = requireUser(ctx);
  if (user.is_super_admin) return user;
  const role = getOrgRole(ctx, user.id, orgId);
  if (role !== 'admin' && role !== 'manager')
    throw new SenderError('Org admin or manager access required');
  return user;
}

// Can manage a specific championship and create/manage its events.
export function requireChampionshipManager(ctx: Ctx, championshipId: bigint) {
  const user = requireUser(ctx);
  if (user.is_super_admin) return user;
  const champ = ctx.db.championship.id.find(championshipId);
  if (!champ) throw new SenderError('Championship not found');
  const orgRole = getOrgRole(ctx, user.id, champ.org_id);
  if (orgRole === 'admin' || orgRole === 'manager') return user;
  const champRole = getChampionshipRole(ctx, user.id, championshipId);
  if (champRole === 'manager') return user;
  throw new SenderError('Championship manager access required');
}

// Can create an event scoped to an org + optional championship.
export function requireEventCreator(ctx: Ctx, orgId: bigint, championshipId: bigint) {
  const user = requireUser(ctx);
  if (user.is_super_admin) return user;
  const orgRole = getOrgRole(ctx, user.id, orgId);
  if (orgRole === 'admin' || orgRole === 'manager') return user;
  if (championshipId) {
    const champRole = getChampionshipRole(ctx, user.id, championshipId);
    if (champRole === 'manager') return user;
  }
  throw new SenderError('Event manager access required');
}

// Can manage a specific event (org admin/manager, championship manager, or event manager).
export function requireEventManager(ctx: Ctx, eventId: bigint) {
  const user = requireUser(ctx);
  if (user.is_super_admin) return user;
  const evt = ctx.db.event.id.find(eventId);
  if (!evt) throw new SenderError('Event not found');
  const orgRole = getOrgRole(ctx, user.id, evt.org_id);
  if (orgRole === 'admin' || orgRole === 'manager') return user;
  if (evt.championship_id) {
    const champRole = getChampionshipRole(ctx, user.id, evt.championship_id);
    if (champRole === 'manager') return user;
  }
  const evtRole = getEventRole(ctx, user.id, eventId);
  if (evtRole === 'manager') return user;
  throw new SenderError('Event manager access required');
}

export function requireTimekeeper(ctx: Ctx, eventId: bigint) {
  const user = requireUser(ctx);
  if (user.is_super_admin) return user;
  const evt = ctx.db.event.id.find(eventId);
  if (!evt) throw new SenderError('Event not found');
  const orgRole = getOrgRole(ctx, user.id, evt.org_id);
  if (orgRole) return user;
  if (evt.championship_id) {
    const champRole = getChampionshipRole(ctx, user.id, evt.championship_id);
    if (champRole === 'manager' || champRole === 'timekeeper') return user;
  }
  const evtRole = getEventRole(ctx, user.id, eventId);
  if (evtRole === 'manager' || evtRole === 'timekeeper') return user;
  throw new SenderError('Timekeeper access required');
}

export function getEventIdFromRun(ctx: Ctx, runId: bigint): bigint {
  const run = ctx.db.run.id.find(runId);
  if (!run) throw new SenderError('Run not found');
  const et = ctx.db.event_track.id.find(run.event_track_id);
  if (!et) throw new SenderError('Event track not found');
  return et.event_id;
}

export function getEventIdFromEventTrack(ctx: Ctx, eventTrackId: bigint): bigint {
  const et = ctx.db.event_track.id.find(eventTrackId);
  if (!et) throw new SenderError('Event track not found');
  return et.event_id;
}

// Can the user manage this location?
export function requireLocationManager(ctx: Ctx, locationId: bigint) {
  const location = ctx.db.location.id.find(locationId);
  if (!location) throw new SenderError('Location not found');
  return requireOrgEventManager(ctx, location.org_id);
}

// Check if a number range overlaps with any existing category in the event.
export function checkCategoryRangeOverlap(
  ctx: Ctx,
  eventId: bigint,
  rangeStart: number,
  rangeEnd: number,
  excludeId: bigint | null
) {
  for (const cat of ctx.db.event_category.iter()) {
    if (cat.event_id !== eventId) continue;
    if (excludeId !== null && cat.id === excludeId) continue;
    if (rangeStart <= cat.number_range_end && rangeEnd >= cat.number_range_start) {
      throw new SenderError(
        `Number range ${rangeStart}–${rangeEnd} overlaps with category "${cat.name}" (${cat.number_range_start}–${cat.number_range_end})`
      );
    }
  }
}

// Resolve entity to its location's org_id for permission checks
export function getEntityOrgId(ctx: Ctx, entityType: string, entityId: bigint): bigint {
  if (entityType === 'location') {
    const location = ctx.db.location.id.find(entityId);
    if (!location) throw new SenderError('Location not found');
    return location.org_id;
  }
  if (entityType === 'track') {
    const track = ctx.db.track.id.find(entityId);
    if (!track) throw new SenderError('Track not found');
    const location = ctx.db.location.id.find(track.location_id);
    if (!location) throw new SenderError('Location not found');
    return location.org_id;
  }
  if (entityType === 'track_variation') {
    const tv = ctx.db.track_variation.id.find(entityId);
    if (!tv) throw new SenderError('Track variation not found');
    const track = ctx.db.track.id.find(tv.track_id);
    if (!track) throw new SenderError('Track not found');
    const location = ctx.db.location.id.find(track.location_id);
    if (!location) throw new SenderError('Location not found');
    return location.org_id;
  }
  throw new SenderError('Invalid entity type');
}
