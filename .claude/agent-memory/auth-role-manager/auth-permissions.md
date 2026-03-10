# Full Permission Matrix

## Reducer -> Required Permission Mapping

| Reducer | Guard Used | Minimum Role Required |
|---|---|---|
| **Organization Management** | | |
| `create_organization` | `requireUser` | Any authenticated user |
| `rename_organization` | `requireOrgAdmin` | Org admin / super_admin |
| `add_org_member` | `requireOrgAdmin` | Org admin / super_admin |
| `invite_org_member` | `requireOrgAdmin` | Org admin / super_admin |
| `resend_org_invitation` | `requireOrgAdmin` | Org admin / super_admin |
| `remove_org_member` | `requireOrgAdmin` | Org admin / super_admin |
| `leave_organization` | `requireUser` | Any authenticated user (self-service) |
| `transfer_org_ownership` | `requireOrgOwner` | Org owner / super_admin |
| **Championship Management** | | |
| `create_championship` | `requireOrgEventManager` | Org admin or manager / super_admin |
| `update_championship` | `requireOrgEventManager` | Org admin or manager / super_admin |
| `delete_championship` | `requireOrgEventManager` | Org admin or manager / super_admin |
| **Venue/Location Management** | | |
| `create_venue` | `requireOrgEventManager` | Org admin or manager / super_admin |
| `update_venue` | `requireOrgEventManager` | Org admin or manager / super_admin |
| `delete_venue` | `requireOrgEventManager` | Org admin or manager / super_admin |
| **Track Management** | | |
| `create_track` | `requireLocationManager` | Org admin or manager (via venue) / super_admin |
| `update_track` | `requireLocationManager` | Org admin or manager (via venue) / super_admin |
| `delete_track` | `requireLocationManager` | Org admin or manager (via venue) / super_admin |
| `create_track_variation` | `requireLocationManager` | Org admin or manager (via venue) / super_admin |
| `update_track_variation` | `requireLocationManager` | Org admin or manager (via venue) / super_admin |
| `delete_track_variation` | `requireLocationManager` | Org admin or manager (via venue) / super_admin |
| **Event Management** | | |
| `create_event` | `requireOrgEventManager` | Org admin or manager / super_admin |
| `update_event` | `requireOrgEventManager` | Org admin or manager / super_admin |
| `toggle_pin_event` | `requireUser` | Any authenticated user (self-service) |
| **Event Members** | | |
| `add_event_member` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| `remove_event_member` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| **Event Tracks** | | |
| `add_track_to_event` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| `remove_track_from_event` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| **Event Categories** | | |
| `create_event_category` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| `update_event_category` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| `delete_event_category` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| `add_track_to_category` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| `remove_track_from_category` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| `import_categories_from_event` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| **Riders** | | |
| `create_rider` | `requireOrgEventManager` | Org admin or manager / super_admin |
| `update_rider` | `requireOrgEventManager` | Org admin or manager / super_admin |
| `delete_rider` | `requireOrgEventManager` | Org admin or manager / super_admin |
| `set_registration_enabled` | `requireOrgEventManager` | Org admin or manager / super_admin |
| `register_rider_with_org_slug` | NONE | Public (checks registration_enabled flag only) |
| **Event Riders** | | |
| `add_rider_to_event` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| `update_event_rider` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| `import_riders_from_event` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| **Timekeeping** | | |
| `set_track_timekeepers` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| `start_run` | `requireTimekeeper` | Any org role OR event organizer/timekeeper / super_admin |
| `finish_run` | `requireTimekeeper` | Any org role OR event organizer/timekeeper / super_admin |
| `dnf_run` | `requireTimekeeper` | Any org role OR event organizer/timekeeper / super_admin |
| `dns_run` | `requireTimekeeper` | Any org role OR event organizer/timekeeper / super_admin |
| **Scheduling** | | |
| `queue_run` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| `generate_track_schedule` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| `clear_track_schedule` | `requireEventOrganizer` | Org admin/manager OR event organizer / super_admin |
| **Images** | | |
| `add_image` | `requireOrgEventManager` | Org admin or manager / super_admin |
| `delete_image` | `requireOrgEventManager` | Org admin or manager / super_admin |
| `update_image_caption` | `requireOrgEventManager` | Org admin or manager / super_admin |
| **Impersonation** | | |
| `start_impersonation` | Custom logic | Super_admin (unrestricted) or org admin (scoped, non-admin targets only) |
| `stop_impersonation` | NONE | Any connected client (clears own impersonation) |
| **Dev/Seed** | | |
| `wipe_all_data` | NONE | **UNPROTECTED** |
| `transfer_org_ownership_by_email` | NONE | **UNPROTECTED** |
| `seed_demo_data` | NONE (uses getUser, not requireUser) | **UNPROTECTED** |
| **Clock** | | |
| `get_server_time` | (not reviewed) | Likely public |
