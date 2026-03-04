import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireOrgEventManager } from '../lib/auth';

export const create_venue = spacetimedb.reducer(
  {
    org_id: t.u64(),
    name: t.string(),
    description: t.string(),
    address: t.string(),
  },
  (ctx, args) => {
    requireOrgEventManager(ctx, args.org_id);
    ctx.db.venue.insert({
      id: 0n,
      org_id: args.org_id,
      name: args.name,
      description: args.description,
      address: args.address,
    });
  }
);

export const update_venue = spacetimedb.reducer(
  {
    venue_id: t.u64(),
    name: t.string(),
    description: t.string(),
    address: t.string(),
  },
  (ctx, args) => {
    const venue = ctx.db.venue.id.find(args.venue_id);
    if (!venue) throw new SenderError('Venue not found');
    requireOrgEventManager(ctx, venue.org_id);
    ctx.db.venue.id.update({
      ...venue,
      name: args.name,
      description: args.description,
      address: args.address,
    });
  }
);

export const delete_venue = spacetimedb.reducer({ venue_id: t.u64() }, (ctx, args) => {
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
});
