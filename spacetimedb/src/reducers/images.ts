import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireOrgEventManager, getEntityOrgId } from '../lib/auth';

export const add_image = spacetimedb.reducer(
  {
    entity_type: t.string(),
    entity_id: t.u64(),
    data: t.string(),
    caption: t.string(),
  },
  (ctx, args) => {
    const orgId = getEntityOrgId(ctx, args.entity_type, args.entity_id);
    requireOrgEventManager(ctx, orgId);
    // Determine sort_order
    let maxOrder = 0;
    for (const img of ctx.db.image.iter()) {
      if (img.entity_type === args.entity_type && img.entity_id === args.entity_id) {
        if (img.sort_order >= maxOrder) maxOrder = img.sort_order + 1;
      }
    }
    ctx.db.image.insert({
      id: 0n,
      entity_type: args.entity_type,
      entity_id: args.entity_id,
      data: args.data,
      caption: args.caption,
      sort_order: maxOrder,
    });
  }
);

export const delete_image = spacetimedb.reducer({ image_id: t.u64() }, (ctx, args) => {
  const img = ctx.db.image.id.find(args.image_id);
  if (!img) throw new SenderError('Image not found');
  const orgId = getEntityOrgId(ctx, img.entity_type, img.entity_id);
  requireOrgEventManager(ctx, orgId);
  ctx.db.image.id.delete(img.id);
});

export const update_image_caption = spacetimedb.reducer(
  { image_id: t.u64(), caption: t.string() },
  (ctx, args) => {
    const img = ctx.db.image.id.find(args.image_id);
    if (!img) throw new SenderError('Image not found');
    const orgId = getEntityOrgId(ctx, img.entity_type, img.entity_id);
    requireOrgEventManager(ctx, orgId);
    ctx.db.image.id.update({ ...img, caption: args.caption });
  }
);
