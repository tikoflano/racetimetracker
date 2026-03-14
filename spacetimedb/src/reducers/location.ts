import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireOrgEventManager } from '../lib/auth';

export const create_location = spacetimedb.reducer(
  {
    org_id: t.u64(),
    name: t.string(),
    description: t.string(),
    address: t.string(),
    cover_image: t.string(),
  },
  (ctx, args) => {
    if (!args.name.trim()) throw new SenderError('Name is required');
    if (!args.address.trim()) throw new SenderError('Address is required');
    requireOrgEventManager(ctx, args.org_id);
    ctx.db.location.insert({
      id: 0n,
      org_id: args.org_id,
      name: args.name,
      description: args.description,
      address: args.address,
      cover_image: args.cover_image,
    });
  }
);

export const update_location = spacetimedb.reducer(
  {
    location_id: t.u64(),
    name: t.string(),
    description: t.string(),
    address: t.string(),
    cover_image: t.string(),
  },
  (ctx, args) => {
    if (!args.name.trim()) throw new SenderError('Name is required');
    if (!args.address.trim()) throw new SenderError('Address is required');
    const location = ctx.db.location.id.find(args.location_id);
    if (!location) throw new SenderError('Location not found');
    requireOrgEventManager(ctx, location.org_id);
    ctx.db.location.id.update({
      ...location,
      name: args.name,
      description: args.description,
      address: args.address,
      cover_image: args.cover_image,
    });
  }
);

export const delete_location = spacetimedb.reducer({ location_id: t.u64() }, (ctx, args) => {
  const location = ctx.db.location.id.find(args.location_id);
  if (!location) throw new SenderError('Location not found');
  requireOrgEventManager(ctx, location.org_id);
  // Delete all tracks and their variations
  for (const track of ctx.db.track.iter()) {
    if (track.location_id === location.id) {
      for (const tv of ctx.db.track_variation.iter()) {
        if (tv.track_id === track.id) ctx.db.track_variation.id.delete(tv.id);
      }
      ctx.db.track.id.delete(track.id);
    }
  }
  ctx.db.location.id.delete(location.id);
});
