import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireLocationManager } from '../lib/auth';

export const create_track = spacetimedb.reducer(
  { location_id: t.u64(), name: t.string(), color: t.string() },
  (ctx, args) => {
    requireLocationManager(ctx, args.location_id);
    const track = ctx.db.track.insert({
      id: 0n,
      location_id: args.location_id,
      name: args.name,
      color: args.color,
    });
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
    requireLocationManager(ctx, track.location_id);
    ctx.db.track.id.update({ ...track, name: args.name, color: args.color });
  }
);

export const delete_track = spacetimedb.reducer({ track_id: t.u64() }, (ctx, args) => {
  const track = ctx.db.track.id.find(args.track_id);
  if (!track) throw new SenderError('Track not found');
  requireLocationManager(ctx, track.location_id);
  for (const tv of ctx.db.track_variation.iter()) {
    if (tv.track_id === track.id) ctx.db.track_variation.id.delete(tv.id);
  }
  ctx.db.track.id.delete(track.id);
});

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
    requireLocationManager(ctx, track.location_id);
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
    requireLocationManager(ctx, track.location_id);
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
    if (tv.name === 'Default') throw new SenderError('Cannot delete the Default variation.');
    const track = ctx.db.track.id.find(tv.track_id);
    if (!track) throw new SenderError('Track not found');
    requireLocationManager(ctx, track.location_id);
    // Don't allow deleting the last variation
    let count = 0;
    for (const v of ctx.db.track_variation.iter()) {
      if (v.track_id === track.id) count++;
    }
    if (count <= 1)
      throw new SenderError('Cannot delete the last variation. Delete the track instead.');
    ctx.db.track_variation.id.delete(tv.id);
  }
);
