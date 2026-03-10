import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireEventManager } from '../lib/auth';

export const add_rider_to_event = spacetimedb.reducer(
  { event_id: t.u64(), rider_id: t.u64() },
  (ctx, args) => {
    requireEventManager(ctx, args.event_id);
    // Prevent duplicates
    for (const er of ctx.db.event_rider.iter()) {
      if (er.event_id === args.event_id && er.rider_id === args.rider_id) {
        throw new SenderError('Rider already assigned to this event');
      }
    }
    ctx.db.event_rider.insert({
      id: 0n,
      event_id: args.event_id,
      rider_id: args.rider_id,
      category_id: 0n,
      checked_in: false,
      assigned_number: 0,
    });
  }
);

export const update_event_rider = spacetimedb.reducer(
  {
    event_rider_id: t.u64(),
    category_id: t.u64(),
    checked_in: t.bool(),
    assigned_number: t.u32(),
  },
  (ctx, args) => {
    const er = ctx.db.event_rider.id.find(args.event_rider_id);
    if (!er) throw new SenderError('Event rider not found');
    requireEventManager(ctx, er.event_id);
    // Validate category belongs to this event (0 = no category)
    if (args.category_id !== 0n) {
      const cat = ctx.db.event_category.id.find(args.category_id);
      if (!cat || cat.event_id !== er.event_id)
        throw new SenderError('Invalid category for this event');
    }
    ctx.db.event_rider.id.update({
      ...er,
      category_id: args.category_id,
      checked_in: args.checked_in,
      assigned_number: args.assigned_number,
    });
  }
);

export const import_riders_from_event = spacetimedb.reducer(
  { target_event_id: t.u64(), source_event_id: t.u64() },
  (ctx, args) => {
    requireEventManager(ctx, args.target_event_id);
    const existing = new Set<bigint>();
    for (const er of ctx.db.event_rider.iter()) {
      if (er.event_id === args.target_event_id) existing.add(er.rider_id);
    }
    for (const er of ctx.db.event_rider.iter()) {
      if (er.event_id === args.source_event_id && !existing.has(er.rider_id)) {
        ctx.db.event_rider.insert({
          id: 0n,
          event_id: args.target_event_id,
          rider_id: er.rider_id,
          category_id: 0n,
          checked_in: false,
          assigned_number: 0,
        });
        existing.add(er.rider_id);
      }
    }
  }
);
