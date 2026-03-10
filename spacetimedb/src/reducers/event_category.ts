import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireEventManager, checkCategoryRangeOverlap } from '../lib/auth';

export const create_event_category = spacetimedb.reducer(
  {
    event_id: t.u64(),
    name: t.string(),
    description: t.string(),
    number_range_start: t.u32(),
    number_range_end: t.u32(),
  },
  (ctx, args) => {
    requireEventManager(ctx, args.event_id);
    if (!args.name.trim()) throw new SenderError('Category name is required');
    if (args.number_range_start > args.number_range_end)
      throw new SenderError('Range start must be <= range end');
    checkCategoryRangeOverlap(
      ctx,
      args.event_id,
      args.number_range_start,
      args.number_range_end,
      null
    );
    ctx.db.event_category.insert({
      id: 0n,
      event_id: args.event_id,
      name: args.name.trim(),
      description: args.description.trim(),
      number_range_start: args.number_range_start,
      number_range_end: args.number_range_end,
    });
  }
);

export const update_event_category = spacetimedb.reducer(
  {
    category_id: t.u64(),
    name: t.string(),
    description: t.string(),
    number_range_start: t.u32(),
    number_range_end: t.u32(),
  },
  (ctx, args) => {
    const cat = ctx.db.event_category.id.find(args.category_id);
    if (!cat) throw new SenderError('Category not found');
    requireEventManager(ctx, cat.event_id);
    if (!args.name.trim()) throw new SenderError('Category name is required');
    if (args.number_range_start > args.number_range_end)
      throw new SenderError('Range start must be <= range end');
    checkCategoryRangeOverlap(
      ctx,
      cat.event_id,
      args.number_range_start,
      args.number_range_end,
      cat.id
    );
    ctx.db.event_category.id.update({
      ...cat,
      name: args.name.trim(),
      description: args.description.trim(),
      number_range_start: args.number_range_start,
      number_range_end: args.number_range_end,
    });
  }
);

export const delete_event_category = spacetimedb.reducer({ category_id: t.u64() }, (ctx, args) => {
  const cat = ctx.db.event_category.id.find(args.category_id);
  if (!cat) throw new SenderError('Category not found');
  requireEventManager(ctx, cat.event_id);
  for (const ct of ctx.db.category_track.iter()) {
    if (ct.category_id === cat.id) ctx.db.category_track.id.delete(ct.id);
  }
  ctx.db.event_category.id.delete(cat.id);
});

export const add_track_to_category = spacetimedb.reducer(
  { category_id: t.u64(), event_track_id: t.u64() },
  (ctx, args) => {
    const cat = ctx.db.event_category.id.find(args.category_id);
    if (!cat) throw new SenderError('Category not found');
    requireEventManager(ctx, cat.event_id);
    const et = ctx.db.event_track.id.find(args.event_track_id);
    if (!et) throw new SenderError('Event track not found');
    if (et.event_id !== cat.event_id)
      throw new SenderError('Event track must belong to the same event as the category');
    for (const ct of ctx.db.category_track.iter()) {
      if (ct.category_id === cat.id && ct.event_track_id === args.event_track_id) {
        throw new SenderError('Track already assigned to this category');
      }
    }
    ctx.db.category_track.insert({
      id: 0n,
      category_id: cat.id,
      event_track_id: args.event_track_id,
    });
  }
);

export const remove_track_from_category = spacetimedb.reducer(
  { category_track_id: t.u64() },
  (ctx, args) => {
    const ct = ctx.db.category_track.id.find(args.category_track_id);
    if (!ct) throw new SenderError('Category track not found');
    const cat = ctx.db.event_category.id.find(ct.category_id);
    if (!cat) throw new SenderError('Category not found');
    requireEventManager(ctx, cat.event_id);
    ctx.db.category_track.id.delete(ct.id);
  }
);

export const import_categories_from_event = spacetimedb.reducer(
  { target_event_id: t.u64(), source_event_id: t.u64() },
  (ctx, args) => {
    requireEventManager(ctx, args.target_event_id);
    // Collect source categories first, then validate all ranges before inserting
    const toImport: {
      name: string;
      description: string;
      number_range_start: number;
      number_range_end: number;
    }[] = [];
    for (const cat of ctx.db.event_category.iter()) {
      if (cat.event_id === args.source_event_id) {
        toImport.push({
          name: cat.name,
          description: cat.description,
          number_range_start: cat.number_range_start,
          number_range_end: cat.number_range_end,
        });
      }
    }
    // Check each imported category against existing ones in the target event
    for (const imp of toImport) {
      checkCategoryRangeOverlap(
        ctx,
        args.target_event_id,
        imp.number_range_start,
        imp.number_range_end,
        null
      );
    }
    for (const imp of toImport) {
      ctx.db.event_category.insert({
        id: 0n,
        event_id: args.target_event_id,
        name: imp.name,
        description: imp.description,
        number_range_start: imp.number_range_start,
        number_range_end: imp.number_range_end,
      });
    }
  }
);
