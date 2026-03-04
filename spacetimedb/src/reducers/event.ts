import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireUser, requireOrgEventManager } from '../lib/auth';
import { uniqueEventSlug } from '../lib/auth';
import { slugify } from '../lib/utils';

export const create_event = spacetimedb.reducer(
  {
    org_id: t.u64(),
    championship_id: t.u64(),
    venue_id: t.u64(),
    name: t.string(),
    description: t.string(),
    start_date: t.string(),
    end_date: t.string(),
  },
  (ctx, args) => {
    requireOrgEventManager(ctx, args.org_id);
    const trimmed = args.name.trim();
    if (!trimmed) throw new SenderError('Event name cannot be empty');
    for (const e of ctx.db.event.iter()) {
      if (e.championship_id === args.championship_id && e.name === trimmed) {
        throw new SenderError('An event with this name already exists in this championship');
      }
    }
    ctx.db.event.insert({
      id: 0n,
      org_id: args.org_id,
      championship_id: args.championship_id,
      venue_id: args.venue_id,
      name: trimmed,
      slug: uniqueEventSlug(ctx, args.org_id, slugify(trimmed)),
      description: args.description,
      start_date: args.start_date,
      end_date: args.end_date,
    });
  }
);

export const update_event = spacetimedb.reducer(
  {
    event_id: t.u64(),
    name: t.string(),
    description: t.string(),
    start_date: t.string(),
    end_date: t.string(),
  },
  (ctx, args) => {
    const evt = ctx.db.event.id.find(args.event_id);
    if (!evt) throw new SenderError('Event not found');
    requireOrgEventManager(ctx, evt.org_id);
    // Enforce unique name within championship
    const trimmed = args.name.trim();
    if (!trimmed) throw new SenderError('Event name cannot be empty');
    for (const e of ctx.db.event.iter()) {
      if (e.championship_id === evt.championship_id && e.id !== evt.id && e.name === trimmed) {
        throw new SenderError('An event with this name already exists in this championship');
      }
    }
    const newSlug =
      trimmed !== evt.name ? uniqueEventSlug(ctx, evt.org_id, slugify(trimmed), evt.id) : evt.slug;
    ctx.db.event.id.update({
      ...evt,
      name: trimmed,
      slug: newSlug,
      description: args.description,
      start_date: args.start_date,
      end_date: args.end_date,
    });
  }
);

export const toggle_pin_event = spacetimedb.reducer({ event_id: t.u64() }, (ctx, args) => {
  const user = requireUser(ctx);
  // Check if already pinned
  for (const f of ctx.db.pinned_event.iter()) {
    if (f.user_id === user.id && f.event_id === args.event_id) {
      ctx.db.pinned_event.id.delete(f.id);
      return;
    }
  }
  ctx.db.pinned_event.insert({
    id: 0n,
    user_id: user.id,
    event_id: args.event_id,
  });
});
