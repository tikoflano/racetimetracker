import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireEventOrganizer } from '../lib/auth';

export const add_track_to_event = spacetimedb.reducer(
  { event_id: t.u64(), track_variation_id: t.u64(), sort_order: t.u32() },
  (ctx, args) => {
    requireEventOrganizer(ctx, args.event_id);
    for (const et of ctx.db.event_track.iter()) {
      if (et.event_id === args.event_id && et.track_variation_id === args.track_variation_id) {
        throw new SenderError('This track variation is already added to the event');
      }
    }
    ctx.db.event_track.insert({
      id: 0n,
      event_id: args.event_id,
      track_variation_id: args.track_variation_id,
      sort_order: args.sort_order,
    });
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
