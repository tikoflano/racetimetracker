import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { getRealUser, getOrgRole, isOrgOwner } from '../lib/auth';

export const start_impersonation = spacetimedb.reducer({ target_user_id: t.u64() }, (ctx, args) => {
  const realUser = getRealUser(ctx);
  if (!realUser) throw new SenderError('Not authenticated');

  const target = ctx.db.user.id.find(args.target_user_id);
  if (!target) throw new SenderError('Target user not found');
  if (target.id === realUser.id) throw new SenderError('Cannot impersonate yourself');

  let orgId = 0n; // 0 = super_admin, unrestricted

  if (!realUser.is_super_admin) {
    // Org admin: find a shared org where caller is admin and target is a member
    let sharedOrgId: bigint | null = null;

    for (const om of ctx.db.org_member.iter()) {
      if (om.user_id !== realUser.id) continue;
      const callerRole = getOrgRole(ctx, realUser.id, om.org_id);
      if (callerRole !== 'admin') continue;

      // Target must not be an admin in this org
      const targetRole = getOrgRole(ctx, target.id, om.org_id);
      if (targetRole === 'admin') continue;

      // Check target is in this org (org member, event member, or org owner)
      if (isOrgOwner(ctx, target.id, om.org_id)) {
        sharedOrgId = om.org_id;
        break;
      }
      if (targetRole) {
        sharedOrgId = om.org_id;
        break;
      }

      // Check event members within this org
      let found = false;
      for (const evt of ctx.db.event.iter()) {
        if (evt.org_id !== om.org_id) continue;
        for (const em of ctx.db.event_member.iter()) {
          if (em.event_id === evt.id && em.user_id === target.id) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) {
        sharedOrgId = om.org_id;
        break;
      }
    }

    // Also check if caller is org owner
    if (!sharedOrgId) {
      for (const org of ctx.db.organization.iter()) {
        if (org.owner_user_id !== realUser.id) continue;
        const targetRole = getOrgRole(ctx, target.id, org.id);
        if (targetRole === 'admin') continue;
        // Check target is associated with this org
        if (targetRole) {
          sharedOrgId = org.id;
          break;
        }
        let found = false;
        for (const evt of ctx.db.event.iter()) {
          if (evt.org_id !== org.id) continue;
          for (const em of ctx.db.event_member.iter()) {
            if (em.event_id === evt.id && em.user_id === target.id) {
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (found) {
          sharedOrgId = org.id;
          break;
        }
      }
    }

    if (!sharedOrgId)
      throw new SenderError('Cannot impersonate this user — they are not in your organization');
    orgId = sharedOrgId;
  }

  // Upsert: remove existing impersonation for this admin
  for (const imp of ctx.db.impersonation.iter()) {
    if (imp.admin_identity.isEqual(ctx.sender)) {
      ctx.db.impersonation.id.delete(imp.id);
      break;
    }
  }
  for (const st of ctx.db.impersonation_status.iter()) {
    if (st.admin_identity.isEqual(ctx.sender)) {
      ctx.db.impersonation_status.id.delete(st.id);
      break;
    }
  }

  ctx.db.impersonation.insert({
    id: 0n,
    admin_identity: ctx.sender,
    target_user_id: target.id,
    org_id: orgId,
  });
  ctx.db.impersonation_status.insert({
    id: 0n,
    admin_identity: ctx.sender,
    target_user_id: target.id,
    target_user_name: target.name || target.email,
    org_id: orgId,
  });
});

export const stop_impersonation = spacetimedb.reducer({}, (ctx) => {
  for (const imp of ctx.db.impersonation.iter()) {
    if (imp.admin_identity.isEqual(ctx.sender)) {
      ctx.db.impersonation.id.delete(imp.id);
      break;
    }
  }
  for (const st of ctx.db.impersonation_status.iter()) {
    if (st.admin_identity.isEqual(ctx.sender)) {
      ctx.db.impersonation_status.id.delete(st.id);
      break;
    }
  }
});
