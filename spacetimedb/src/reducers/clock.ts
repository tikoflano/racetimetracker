import { t } from 'spacetimedb/server';
import spacetimedb from '../schema';

export const get_server_time = spacetimedb.reducer({ request_id: t.u64() }, (ctx, args) => {
  const now = BigInt(Date.now());
  // Upsert: find existing row for this identity
  let existing = null;
  for (const row of ctx.db.server_time_response.iter()) {
    if (row.identity.isEqual(ctx.sender)) {
      existing = row;
      break;
    }
  }
  if (existing) {
    ctx.db.server_time_response.id.update({
      ...existing,
      server_time: now,
      request_id: args.request_id,
    });
  } else {
    ctx.db.server_time_response.insert({
      id: 0n,
      identity: ctx.sender,
      server_time: now,
      request_id: args.request_id,
    });
  }
});
