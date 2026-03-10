import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireChampionshipManager } from '../lib/auth';

export const add_championship_member = spacetimedb.reducer(
  { championship_id: t.u64(), user_id: t.u64(), role: t.string() },
  (ctx, args) => {
    requireChampionshipManager(ctx, args.championship_id);
    if (args.role !== 'manager' && args.role !== 'timekeeper')
      throw new SenderError('Invalid role');
    for (const m of ctx.db.championship_member.iter()) {
      if (m.championship_id === args.championship_id && m.user_id === args.user_id)
        throw new SenderError('User already assigned to this championship');
    }
    ctx.db.championship_member.insert({
      id: 0n,
      championship_id: args.championship_id,
      user_id: args.user_id,
      role: args.role,
    });
  }
);

export const update_championship_member = spacetimedb.reducer(
  { championship_member_id: t.u64(), role: t.string() },
  (ctx, args) => {
    const member = ctx.db.championship_member.id.find(args.championship_member_id);
    if (!member) throw new SenderError('Member not found');
    requireChampionshipManager(ctx, member.championship_id);
    if (args.role !== 'manager' && args.role !== 'timekeeper')
      throw new SenderError('Invalid role');
    ctx.db.championship_member.id.update({ ...member, role: args.role });
  }
);

export const remove_championship_member = spacetimedb.reducer(
  { championship_member_id: t.u64() },
  (ctx, args) => {
    const member = ctx.db.championship_member.id.find(args.championship_member_id);
    if (!member) throw new SenderError('Member not found');
    requireChampionshipManager(ctx, member.championship_id);
    ctx.db.championship_member.id.delete(member.id);
  }
);
