import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireOrgEventManager } from '../lib/auth';

export const create_championship = spacetimedb.reducer(
  {
    org_id: t.u64(),
    name: t.string(),
    description: t.string(),
    color: t.string(),
  },
  (ctx, args) => {
    requireOrgEventManager(ctx, args.org_id);
    ctx.db.championship.insert({
      id: 0n,
      org_id: args.org_id,
      name: args.name,
      description: args.description,
      color: args.color || '#3b82f6',
    });
  }
);

export const update_championship = spacetimedb.reducer(
  {
    championship_id: t.u64(),
    name: t.string(),
    description: t.string(),
    color: t.string(),
  },
  (ctx, args) => {
    const champ = ctx.db.championship.id.find(args.championship_id);
    if (!champ) throw new SenderError('Championship not found');
    requireOrgEventManager(ctx, champ.org_id);
    const trimmed = args.name.trim();
    if (trimmed.length === 0) throw new SenderError('Name cannot be empty');
    ctx.db.championship.id.update({
      ...champ,
      name: trimmed,
      description: args.description,
      color: args.color || champ.color,
    });
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
        for (const r of ctx.db.run.iter()) {
          if (r.event_track_id === et.id) ctx.db.run.id.delete(r.id);
        }
        for (const s of ctx.db.event_track_schedule.iter()) {
          if (s.event_track_id === et.id) ctx.db.event_track_schedule.id.delete(s.id);
        }
        for (const a of ctx.db.timekeeper_assignment.iter()) {
          if (a.event_track_id === et.id) ctx.db.timekeeper_assignment.id.delete(a.id);
        }
        ctx.db.event_track.id.delete(et.id);
      }
      for (const er of ctx.db.event_rider.iter()) {
        if (er.event_id === evt.id) ctx.db.event_rider.id.delete(er.id);
      }
      for (const em of ctx.db.event_member.iter()) {
        if (em.event_id === evt.id) ctx.db.event_member.id.delete(em.id);
      }
      for (const ec of ctx.db.event_category.iter()) {
        if (ec.event_id !== evt.id) continue;
        for (const ct of ctx.db.category_track.iter()) {
          if (ct.category_id === ec.id) ctx.db.category_track.id.delete(ct.id);
        }
        ctx.db.event_category.id.delete(ec.id);
      }
      for (const pe of ctx.db.pinned_event.iter()) {
        if (pe.event_id === evt.id) ctx.db.pinned_event.id.delete(pe.id);
      }
      ctx.db.event.id.delete(evt.id);
    }
    ctx.db.championship.id.delete(champ.id);
  }
);
