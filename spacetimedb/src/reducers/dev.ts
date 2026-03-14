import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireSuperAdmin } from '../lib/auth';

export const wipe_all_data = spacetimedb.reducer((ctx) => {
  requireSuperAdmin(ctx);
  const tables = [
    ctx.db.run,
    ctx.db.event_track_schedule,
    ctx.db.category_track,
    ctx.db.event_category,
    ctx.db.event_rider,
    ctx.db.event_track,
    ctx.db.timekeeper_assignment,
    ctx.db.event,
    ctx.db.championship,
    ctx.db.track_variation,
    ctx.db.track,
    ctx.db.location,
    ctx.db.rider,
    ctx.db.pinned_event,
    ctx.db.event_member,
    ctx.db.org_member,
    ctx.db.image,
    ctx.db.impersonation,
    ctx.db.impersonation_status,
    ctx.db.server_time_response,
    ctx.db.organization,
    ctx.db.user,
  ];
  for (const tbl of tables) {
    for (const row of tbl.iter()) tbl.id.delete(row.id);
  }
});

export const transfer_org_ownership_by_email = spacetimedb.reducer(
  { org_id: t.u64(), email: t.string() },
  (ctx, args) => {
    requireSuperAdmin(ctx);
    const org = ctx.db.organization.id.find(args.org_id);
    if (!org) throw new SenderError('Organization not found');
    const trimmedEmail = args.email.trim().toLowerCase();
    let targetUser = null;
    for (const u of ctx.db.user.iter()) {
      if (u.email === trimmedEmail) {
        targetUser = u;
        break;
      }
    }
    if (!targetUser) throw new SenderError('User not found with that email');
    if (org.owner_user_id === targetUser.id) throw new SenderError('User is already the owner');
    ctx.db.organization.id.update({ ...org, owner_user_id: targetUser.id });
    let member = null;
    for (const m of ctx.db.org_member.iter()) {
      if (m.org_id === args.org_id && m.user_id === targetUser.id) {
        member = m;
        break;
      }
    }
    if (member) {
      if (member.role !== 'admin') ctx.db.org_member.id.update({ ...member, role: 'admin' });
    } else {
      ctx.db.org_member.insert({
        id: 0n,
        org_id: args.org_id,
        user_id: targetUser.id,
        role: 'admin',
      });
    }
  }
);
