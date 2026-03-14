import { table, t } from 'spacetimedb/server';

export const user = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    identity: t.identity().unique(),
    google_sub: t.string().unique(),
    email: t.string(),
    name: t.string(),
    picture: t.string(),
    is_super_admin: t.bool(),
  }
);

export const organization = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    name: t.string().unique(),
    slug: t.string().unique(),
    owner_user_id: t.u64().index('btree'),
    registration_enabled: t.bool().default(true),
  }
);

// role: 'admin' | 'manager' | 'timekeeper'
export const org_member = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    org_id: t.u64().index('btree'),
    user_id: t.u64().index('btree'),
    role: t.string(),
  }
);

// role: 'manager' | 'timekeeper'
export const championship_member = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    championship_id: t.u64().index('btree'),
    user_id: t.u64().index('btree'),
    role: t.string(), // 'manager' | 'timekeeper'
  }
);

// role: 'manager' | 'timekeeper'
export const event_member = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    event_id: t.u64().index('btree'),
    user_id: t.u64().index('btree'),
    role: t.string(),
  }
);

export const championship = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    org_id: t.u64().index('btree'),
    name: t.string(),
    description: t.string(),
    color: t.string(), // hex color e.g. "#3b82f6"
  }
);

export const location = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    org_id: t.u64().index('btree'),
    name: t.string(),
    description: t.string(),
    address: t.string(),
    cover_image: t.string(), // base64 data URL or empty string
  }
);

export const event = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    org_id: t.u64().index('btree'),
    championship_id: t.u64().index('btree'),
    location_id: t.u64().index('btree'),
    name: t.string(),
    slug: t.string(),
    description: t.string(),
    start_date: t.string(),
    end_date: t.string(),
  }
);

export const track = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    location_id: t.u64().index('btree'),
    name: t.string(),
    color: t.string(),
  }
);

export const track_variation = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    track_id: t.u64().index('btree'),
    name: t.string(),
    description: t.string(),
    start_latitude: t.f64(),
    start_longitude: t.f64(),
    end_latitude: t.f64(),
    end_longitude: t.f64(),
  }
);

export const rider = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    org_id: t.u64().index('btree'),
    first_name: t.string(),
    last_name: t.string(),
    email: t.string(),
    phone: t.string(),
    date_of_birth: t.string(),
    sex: t.string(),
    profile_picture: t.string(),
  }
);

export const event_track = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    event_id: t.u64().index('btree'),
    track_variation_id: t.u64().index('btree'),
    sort_order: t.u32(),
  }
);

export const event_rider = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    event_id: t.u64().index('btree'),
    rider_id: t.u64().index('btree'),
    category_id: t.u64(), // 0 = no category
    checked_in: t.bool(),
    assigned_number: t.u32().default(0), // 0 = use default from category
  }
);

export const run = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    event_track_id: t.u64().index('btree'),
    rider_id: t.u64().index('btree'),
    sort_order: t.u32(),
    status: t.string(),
    start_time: t.u64(),
    end_time: t.u64(),
  }
);

// Per-track schedule config: start time (ms) and interval between riders (seconds)
export const event_track_schedule = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    event_track_id: t.u64().unique(),
    start_time: t.u64(),
    interval_seconds: t.u32(),
  }
);

export const pinned_event = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    user_id: t.u64().index('btree'),
    event_id: t.u64().index('btree'),
  }
);

export const event_category = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    event_id: t.u64().index('btree'),
    name: t.string(),
    description: t.string(),
    number_range_start: t.u32(),
    number_range_end: t.u32(),
  }
);

// Tracks that riders in this category will race on (subset of event tracks)
export const category_track = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    category_id: t.u64().index('btree'),
    event_track_id: t.u64().index('btree'),
  }
);

// Clock sync: one row per user, overwritten on each request
export const server_time_response = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    identity: t.identity().unique(),
    server_time: t.u64(),
    request_id: t.u64(),
  }
);

// Private: only the server reads this for permission resolution
export const impersonation = table(
  { public: false },
  {
    id: t.u64().primaryKey().autoInc(),
    admin_identity: t.identity().unique(),
    target_user_id: t.u64(),
    org_id: t.u64(), // 0 = super_admin (all orgs), otherwise scoped to this org
  }
);

// Public mirror so the client knows its own impersonation state
export const impersonation_status = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    admin_identity: t.identity().unique(),
    target_user_id: t.u64(),
    target_user_name: t.string(),
    org_id: t.u64(),
  }
);

export const image = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    entity_type: t.string(), // 'location' | 'track' | 'track_variation'
    entity_id: t.u64().index('btree'),
    data: t.string(), // base64 data URI
    caption: t.string(),
    sort_order: t.u32(),
  }
);

// position: 'start' | 'end' | 'both'
export const timekeeper_assignment = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    event_track_id: t.u64().index('btree'),
    user_id: t.u64().index('btree'),
    position: t.string(),
  }
);
