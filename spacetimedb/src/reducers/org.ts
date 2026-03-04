import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from '../schema';
import { requireUser, requireOrgAdmin, requireOrgOwner } from '../lib/auth';
import { uniqueOrgSlug } from '../lib/auth';
import { slugify } from '../lib/utils';
import { placeholderIdentity } from '../lib/utils';

export const create_organization = spacetimedb.reducer({ name: t.string() }, (ctx, args) => {
  const user = requireUser(ctx);
  const org = ctx.db.organization.insert({
    id: 0n,
    name: args.name,
    slug: uniqueOrgSlug(ctx, slugify(args.name)),
    owner_user_id: user.id,
    registration_enabled: true,
  });
  // Creator becomes admin
  ctx.db.org_member.insert({
    id: 0n,
    org_id: org.id,
    user_id: user.id,
    role: 'admin',
  });
});

export const rename_organization = spacetimedb.reducer(
  { org_id: t.u64(), name: t.string() },
  (ctx, args) => {
    requireOrgAdmin(ctx, args.org_id);
    const trimmed = args.name.trim();
    if (trimmed.length === 0) throw new SenderError('Name cannot be empty');
    // Check uniqueness
    for (const o of ctx.db.organization.iter()) {
      if (o.id !== args.org_id && o.name === trimmed) {
        throw new SenderError('An organization with that name already exists');
      }
    }
    const org = ctx.db.organization.id.find(args.org_id);
    if (!org) throw new SenderError('Organization not found');
    const newSlug = uniqueOrgSlug(ctx, slugify(trimmed));
    ctx.db.organization.id.update({ ...org, name: trimmed, slug: newSlug });
  }
);

export const add_org_member = spacetimedb.reducer(
  { org_id: t.u64(), user_id: t.u64(), role: t.string() },
  (ctx, args) => {
    requireOrgAdmin(ctx, args.org_id);
    if (args.role !== 'admin' && args.role !== 'manager' && args.role !== 'timekeeper')
      throw new SenderError('Invalid role');
    // Prevent duplicates
    for (const m of ctx.db.org_member.iter()) {
      if (m.org_id === args.org_id && m.user_id === args.user_id)
        throw new SenderError('User already a member');
    }
    ctx.db.org_member.insert({
      id: 0n,
      org_id: args.org_id,
      user_id: args.user_id,
      role: args.role,
    });
  }
);

export const invite_org_member = spacetimedb.reducer(
  { org_id: t.u64(), email: t.string(), name: t.string(), role: t.string() },
  (ctx, args) => {
    requireOrgAdmin(ctx, args.org_id);
    if (args.role !== 'admin' && args.role !== 'manager' && args.role !== 'timekeeper')
      throw new SenderError('Invalid role');

    const trimmedEmail = args.email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@'))
      throw new SenderError('Valid email is required');

    const trimmedName = (args.name ?? '').trim() || trimmedEmail.split('@')[0];

    let targetUser = null;
    for (const u of ctx.db.user.iter()) {
      if (u.email === trimmedEmail) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser) {
      targetUser = ctx.db.user.insert({
        id: 0n,
        identity: placeholderIdentity(trimmedEmail),
        google_sub: `pending:${trimmedEmail}`,
        email: trimmedEmail,
        name: trimmedName,
        picture: '',
        is_super_admin: false,
      });
    } else if (targetUser.google_sub.startsWith('pending:')) {
      // Update name for existing pending user
      ctx.db.user.id.update({ ...targetUser, name: trimmedName });
    }

    for (const m of ctx.db.org_member.iter()) {
      if (m.org_id === args.org_id && m.user_id === targetUser.id) {
        throw new SenderError('User already a member');
      }
    }
    ctx.db.org_member.insert({
      id: 0n,
      org_id: args.org_id,
      user_id: targetUser.id,
      role: args.role,
    });
  }
);

export const resend_org_invitation = spacetimedb.reducer(
  { org_member_id: t.u64() },
  (ctx, args) => {
    const member = ctx.db.org_member.id.find(args.org_member_id);
    if (!member) throw new SenderError('Member not found');
    requireOrgAdmin(ctx, member.org_id);

    const targetUser = ctx.db.user.id.find(member.user_id);
    if (!targetUser) throw new SenderError('User not found');
    if (!targetUser.google_sub.startsWith('pending:'))
      throw new SenderError('User has already accepted the invitation');
    if (!targetUser.email || !targetUser.email.includes('@'))
      throw new SenderError('User must have a valid email');

    // Invitation resend validated — actual email sending would be integrated here
  }
);

export const remove_org_member = spacetimedb.reducer({ org_member_id: t.u64() }, (ctx, args) => {
  const member = ctx.db.org_member.id.find(args.org_member_id);
  if (!member) throw new SenderError('Member not found');
  requireOrgAdmin(ctx, member.org_id);
  ctx.db.org_member.id.delete(member.id);
});

export const leave_organization = spacetimedb.reducer({ org_id: t.u64() }, (ctx, args) => {
  const user = requireUser(ctx);
  const org = ctx.db.organization.id.find(args.org_id);
  if (!org) throw new SenderError('Organization not found');

  // Find caller's membership
  let myMember = null;
  for (const m of ctx.db.org_member.iter()) {
    if (m.org_id === args.org_id && m.user_id === user.id) {
      myMember = m;
      break;
    }
  }

  // Check if there are other real (non-pending) admins
  let hasOtherAdmin = false;
  if (org.owner_user_id !== user.id) {
    hasOtherAdmin = true; // owner stays
  } else {
    for (const m of ctx.db.org_member.iter()) {
      if (m.org_id === args.org_id && m.user_id !== user.id && m.role === 'admin') {
        const u = ctx.db.user.id.find(m.user_id);
        if (u && !u.google_sub.startsWith('pending:')) {
          hasOtherAdmin = true;
          break;
        }
      }
    }
  }

  // Remove membership
  if (myMember) ctx.db.org_member.id.delete(myMember.id);

  if (hasOtherAdmin) return;

  // No other admins — delete the org and all its data
  for (const evt of ctx.db.event.iter()) {
    if (evt.org_id !== args.org_id) continue;
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
  for (const c of ctx.db.championship.iter()) {
    if (c.org_id === args.org_id) ctx.db.championship.id.delete(c.id);
  }
  for (const v of ctx.db.venue.iter()) {
    if (v.org_id !== args.org_id) continue;
    for (const track of ctx.db.track.iter()) {
      if (track.venue_id !== v.id) continue;
      for (const tv of ctx.db.track_variation.iter()) {
        if (tv.track_id === track.id) ctx.db.track_variation.id.delete(tv.id);
      }
      ctx.db.track.id.delete(track.id);
    }
    ctx.db.venue.id.delete(v.id);
  }
  for (const r of ctx.db.rider.iter()) {
    if (r.org_id === args.org_id) ctx.db.rider.id.delete(r.id);
  }
  for (const m of ctx.db.org_member.iter()) {
    if (m.org_id === args.org_id) ctx.db.org_member.id.delete(m.id);
  }
  ctx.db.organization.id.delete(args.org_id);
});

export const transfer_org_ownership = spacetimedb.reducer(
  { org_id: t.u64(), new_owner_user_id: t.u64() },
  (ctx, args) => {
    requireOrgOwner(ctx, args.org_id);
    const org = ctx.db.organization.id.find(args.org_id);
    if (!org) throw new SenderError('Organization not found');
    if (org.owner_user_id === args.new_owner_user_id)
      throw new SenderError('User is already the owner');
    const newOwner = ctx.db.user.id.find(args.new_owner_user_id);
    if (!newOwner) throw new SenderError('New owner user not found');
    ctx.db.organization.id.update({
      ...org,
      owner_user_id: args.new_owner_user_id,
    });
    // Ensure new owner has admin role (add or update org_member)
    let member = null;
    for (const m of ctx.db.org_member.iter()) {
      if (m.org_id === args.org_id && m.user_id === args.new_owner_user_id) {
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
        user_id: args.new_owner_user_id,
        role: 'admin',
      });
    }
  }
);
