import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireEventManager } from '../lib/auth';

export const add_event_member = spacetimedb.reducer(
  { event_id: t.u64(), user_id: t.u64(), role: t.string() },
  (ctx, args) => {
    requireEventManager(ctx, args.event_id);
    if (args.role !== 'manager' && args.role !== 'timekeeper')
      throw new SenderError('Invalid role');
    for (const m of ctx.db.event_member.iter()) {
      if (m.event_id === args.event_id && m.user_id === args.user_id)
        throw new SenderError('User already assigned');
    }
    ctx.db.event_member.insert({
      id: 0n,
      event_id: args.event_id,
      user_id: args.user_id,
      role: args.role,
    });
  }
);

export const remove_event_member = spacetimedb.reducer(
  { event_member_id: t.u64() },
  (ctx, args) => {
    const member = ctx.db.event_member.id.find(args.event_member_id);
    if (!member) throw new SenderError('Member not found');
    requireEventManager(ctx, member.event_id);
    ctx.db.event_member.id.delete(member.id);
  }
);
