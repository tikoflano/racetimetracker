import spacetimedb from '../schema';
import { GOOGLE_ISSUER } from '../config';
import { generateUniqueOrgName, uniqueOrgSlug } from '../lib/auth';
import { slugify } from '../lib/utils';

export const on_connect = spacetimedb.clientConnected((ctx) => {
  const jwt = ctx.senderAuth.jwt;
  // Anonymous connections are allowed (read-only via subscriptions)
  if (!jwt) return;
  // Only accept Google OAuth tokens; reject others (e.g. Codespaces, dev tools) to avoid orphan "User's Organization"
  if (jwt.issuer !== GOOGLE_ISSUER) return;

  const sub = jwt.subject;
  const email = (jwt.fullPayload['email'] as string) ?? '';
  const name = (jwt.fullPayload['name'] as string) ?? '';
  const picture = (jwt.fullPayload['picture'] as string) ?? '';

  // Check if user already exists by google_sub
  let existing = null;
  for (const u of ctx.db.user.iter()) {
    if (u.google_sub === sub) {
      existing = u;
      break;
    }
  }

  // If not found by google_sub, check for a pending user with the same email
  if (!existing && email) {
    for (const u of ctx.db.user.iter()) {
      if (u.email === email && u.google_sub.startsWith('pending:')) {
        existing = u;
        break;
      }
    }
  }

  let userId: bigint;

  if (existing) {
    ctx.db.user.id.update({
      id: existing.id,
      identity: ctx.sender,
      google_sub: sub,
      email: email || existing.email,
      name: name || existing.name,
      picture: picture || existing.picture,
      is_super_admin: existing.is_super_admin,
    });
    userId = existing.id;
  } else {
    const newUser = ctx.db.user.insert({
      id: 0n,
      identity: ctx.sender,
      google_sub: sub,
      email,
      name,
      picture,
      is_super_admin: false,
    });
    userId = newUser.id;
  }

  // Auto-create an org if the user doesn't own one (skip when profile is empty to avoid orphan "User's Organization")
  const displayName = name || (email ? email.split('@')[0] : '') || 'User';
  if (displayName === 'User') return; // Incomplete profile — don't create org

  let hasOrg = false;
  for (const o of ctx.db.organization.iter()) {
    if (o.owner_user_id === userId) {
      hasOrg = true;
      break;
    }
  }
  if (!hasOrg) {
    const orgName = generateUniqueOrgName(ctx, `${displayName}'s Organization`);
    ctx.db.organization.insert({
      id: 0n,
      name: orgName,
      slug: uniqueOrgSlug(ctx, slugify(orgName)),
      owner_user_id: userId,
      registration_enabled: true,
    });
  }
});
