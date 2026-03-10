import { schema, type ReducerCtx } from 'spacetimedb/server';
import * as tables from './tables';

const spacetimedb = schema({
  user: tables.user,
  organization: tables.organization,
  org_member: tables.org_member,
  championship_member: tables.championship_member,
  event_member: tables.event_member,
  championship: tables.championship,
  venue: tables.venue,
  event: tables.event,
  track: tables.track,
  track_variation: tables.track_variation,
  rider: tables.rider,
  event_track: tables.event_track,
  event_rider: tables.event_rider,
  run: tables.run,
  event_track_schedule: tables.event_track_schedule,
  pinned_event: tables.pinned_event,
  event_category: tables.event_category,
  category_track: tables.category_track,
  server_time_response: tables.server_time_response,
  impersonation: tables.impersonation,
  impersonation_status: tables.impersonation_status,
  image: tables.image,
  timekeeper_assignment: tables.timekeeper_assignment,
});

export type Ctx = ReducerCtx<typeof spacetimedb.schemaType>;
export default spacetimedb;
