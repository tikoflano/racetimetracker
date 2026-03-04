import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireOrgEventManager } from '../lib/auth';

export const create_rider = spacetimedb.reducer(
  {
    org_id: t.u64(),
    first_name: t.string(),
    last_name: t.string(),
    email: t.string(),
    phone: t.string(),
    date_of_birth: t.string(),
  },
  (ctx, args) => {
    requireOrgEventManager(ctx, args.org_id);
    ctx.db.rider.insert({
      id: 0n,
      org_id: args.org_id,
      first_name: args.first_name,
      last_name: args.last_name,
      email: args.email,
      phone: args.phone,
      date_of_birth: args.date_of_birth,
    });
  }
);

export const update_rider = spacetimedb.reducer(
  {
    rider_id: t.u64(),
    first_name: t.string(),
    last_name: t.string(),
    email: t.string(),
    phone: t.string(),
    date_of_birth: t.string(),
  },
  (ctx, args) => {
    const rider = ctx.db.rider.id.find(args.rider_id);
    if (!rider) throw new SenderError('Rider not found');
    requireOrgEventManager(ctx, rider.org_id);
    ctx.db.rider.id.update({
      ...rider,
      first_name: args.first_name,
      last_name: args.last_name,
      email: args.email,
      phone: args.phone,
      date_of_birth: args.date_of_birth,
    });
  }
);

export const delete_rider = spacetimedb.reducer({ rider_id: t.u64() }, (ctx, args) => {
  const rider = ctx.db.rider.id.find(args.rider_id);
  if (!rider) throw new SenderError('Rider not found');
  requireOrgEventManager(ctx, rider.org_id);
  // Remove from all events
  for (const er of ctx.db.event_rider.iter()) {
    if (er.rider_id === rider.id) ctx.db.event_rider.id.delete(er.id);
  }
  ctx.db.rider.id.delete(rider.id);
});

export const set_registration_enabled = spacetimedb.reducer(
  { org_id: t.u64(), enabled: t.bool() },
  (ctx, args) => {
    requireOrgEventManager(ctx, args.org_id);
    const org = ctx.db.organization.id.find(args.org_id);
    if (!org) throw new SenderError('Organization not found');
    ctx.db.organization.id.update({
      ...org,
      registration_enabled: args.enabled,
    });
  }
);

export const register_rider_with_org_slug = spacetimedb.reducer(
  {
    org_slug: t.string(),
    first_name: t.string(),
    last_name: t.string(),
    email: t.string(),
    phone: t.string(),
    date_of_birth: t.string(),
  },
  (ctx, args) => {
    let org = null;
    for (const o of ctx.db.organization.iter()) {
      if (o.slug === args.org_slug) {
        org = o;
        break;
      }
    }
    if (!org) throw new SenderError('Organization not found');
    if (org.registration_enabled === false)
      throw new SenderError('Registration is disabled for this organization');
    ctx.db.rider.insert({
      id: 0n,
      org_id: org.id,
      first_name: args.first_name,
      last_name: args.last_name,
      email: args.email,
      phone: args.phone,
      date_of_birth: args.date_of_birth,
    });
  }
);
