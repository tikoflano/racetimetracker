import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireEventManager, getEventIdFromEventTrack } from '../lib/auth';
import { parseEventDateStart, parseEventDateEnd } from '../lib/utils';

export const queue_run = spacetimedb.reducer(
  { event_track_id: t.u64(), rider_id: t.u64(), sort_order: t.u32() },
  (ctx, args) => {
    const eventId = getEventIdFromEventTrack(ctx, args.event_track_id);
    requireEventManager(ctx, eventId);
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

export const generate_track_schedule = spacetimedb.reducer(
  { event_track_id: t.u64(), start_time: t.u64(), interval_seconds: t.u32() },
  (ctx, args) => {
    const et = ctx.db.event_track.id.find(args.event_track_id);
    if (!et) throw new SenderError('Event track not found');
    const eventId = et.event_id;
    requireEventManager(ctx, eventId);

    const evt = ctx.db.event.id.find(eventId);
    if (!evt) throw new SenderError('Event not found');

    const minTime = parseEventDateStart(evt.start_date);
    const maxTime = parseEventDateEnd(evt.end_date);
    const startMs = Number(args.start_time);
    if (startMs < minTime || startMs > maxTime) {
      throw new SenderError(
        `Start time must be within event dates ${evt.start_date} to ${evt.end_date}`
      );
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
    const eventRiders: {
      rider_id: bigint;
      category_id: bigint;
      assigned_number: number;
      sort_name: string;
    }[] = [];
    for (const er of ctx.db.event_rider.iter()) {
      if (er.event_id !== eventId) continue;
      const cat = er.category_id !== 0n ? ctx.db.event_category.id.find(er.category_id) : null;
      const rider = ctx.db.rider.id.find(er.rider_id);
      const num =
        er.assigned_number !== 0 ? er.assigned_number : cat ? cat.number_range_start : 9999;
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
    requireEventManager(ctx, eventId);

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
