import './config';
import spacetimedb from './schema';
export default spacetimedb;

import './reducers/lifecycle';
import './reducers/org';
import './reducers/event_member';
import './reducers/championship';
import './reducers/location';
import './reducers/event';
import './reducers/track';
import './reducers/rider';
import './reducers/event_track';
import './reducers/event_category';
import './reducers/event_rider';
import './reducers/run';
import './reducers/clock';
import './reducers/impersonation';
import './reducers/timekeeper';
import './reducers/images';
import './reducers/seed';
import './reducers/dev';

// Re-export reducers so spacetime generate can extract them
export { on_connect } from './reducers/lifecycle';
export {
  create_organization,
  rename_organization,
  add_org_member,
  invite_org_member,
  resend_org_invitation,
  remove_org_member,
  leave_organization,
  transfer_org_ownership,
} from './reducers/org';
export { add_event_member, remove_event_member } from './reducers/event_member';
export {
  create_championship,
  update_championship,
  delete_championship,
} from './reducers/championship';
export { create_venue, update_venue, delete_venue } from './reducers/location';
export { create_event, update_event, toggle_pin_event } from './reducers/event';
export {
  create_track,
  update_track,
  delete_track,
  create_track_variation,
  update_track_variation,
  delete_track_variation,
} from './reducers/track';
export {
  create_rider,
  update_rider,
  delete_rider,
  set_registration_enabled,
  register_rider_with_org_slug,
} from './reducers/rider';
export { add_track_to_event, remove_track_from_event } from './reducers/event_track';
export {
  create_event_category,
  update_event_category,
  delete_event_category,
  add_track_to_category,
  remove_track_from_category,
  import_categories_from_event,
} from './reducers/event_category';
export {
  add_rider_to_event,
  update_event_rider,
  import_riders_from_event,
} from './reducers/event_rider';
export { queue_run, generate_track_schedule, clear_track_schedule } from './reducers/run';
export { get_server_time } from './reducers/clock';
export { start_impersonation, stop_impersonation } from './reducers/impersonation';
export {
  set_track_timekeepers,
  start_run,
  finish_run,
  dnf_run,
  dns_run,
} from './reducers/timekeeper';
export { add_image, delete_image, update_image_caption } from './reducers/images';
export { seed_demo_data } from './reducers/seed';
export { wipe_all_data, transfer_org_ownership_by_email } from './reducers/dev';
