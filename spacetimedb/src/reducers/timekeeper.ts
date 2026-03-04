import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import {
  requireEventOrganizer,
  requireTimekeeper,
  getEventIdFromRun,
  getEventIdFromEventTrack,
} from '../lib/auth';
import { resolveClientTime } from '../lib/utils';

// start_user_id / end_user_id: 0 = unassigned
export const set_track_timekeepers = spacetimedb.reducer(
  { event_track_id: t.u64(), start_user_id: t.u64(), end_user_id: t.u64() },
  (ctx, args) => {
    const eventId = getEventIdFromEventTrack(ctx, args.event_track_id);
    requireEventOrganizer(ctx, eventId);
    for (const uid of [args.start_user_id, args.end_user_id]) {
      if (uid !== 0n) {
        const u = ctx.db.user.id.find(uid);
        if (!u) throw new SenderError('User not found');
        if (u.google_sub.startsWith('pending:'))
          throw new SenderError('Pending members cannot be assigned as timekeepers');
      }
    }
    // Clear existing
    for (const a of ctx.db.timekeeper_assignment.iter()) {
      if (a.event_track_id === args.event_track_id) ctx.db.timekeeper_assignment.id.delete(a.id);
    }
    // Insert new
    if (
      args.start_user_id !== 0n &&
      args.end_user_id !== 0n &&
      args.start_user_id === args.end_user_id
    ) {
      ctx.db.timekeeper_assignment.insert({
        id: 0n,
        event_track_id: args.event_track_id,
        user_id: args.start_user_id,
        position: 'both',
      });
    } else {
      if (args.start_user_id !== 0n) {
        ctx.db.timekeeper_assignment.insert({
          id: 0n,
          event_track_id: args.event_track_id,
          user_id: args.start_user_id,
          position: 'start',
        });
      }
      if (args.end_user_id !== 0n) {
        ctx.db.timekeeper_assignment.insert({
          id: 0n,
          event_track_id: args.event_track_id,
          user_id: args.end_user_id,
          position: 'end',
        });
      }
    }
  }
);

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

export const dnf_run = spacetimedb.reducer({ run_id: t.u64() }, (ctx, { run_id }) => {
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
});

export const dns_run = spacetimedb.reducer({ run_id: t.u64() }, (ctx, { run_id }) => {
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
});
