# Notification flow

## Current observed paths

### Database-trigger path

`messages INSERT -> on_message_created -> notify_new_message() -> pg_net -> send-message-notification Edge Function -> notifications / push delivery`.

The live trigger posts to the Supabase Edge Function URL and reads `app.settings.service_role_key`. The function is active with JWT verification. The live function source was not present in this repository, so the 401 responses and whether it inserts notifications or sends push cannot be attributed conclusively without exporting that source and correlating `net._http_response` request rows.

### Application path

`chat-container -> /api/notifications/send -> notifications INSERT -> Firebase send path`.

The chat component filters `visible_to` before this request, but server-side authorization remains the source of truth. This path overlaps the database-trigger path and can create duplicates. It must not be removed until the Edge Function path is exported, tested, and a database uniqueness strategy is reviewed against existing duplicates.

## Current risks and controls

- Web Push subscriptions now normalize `endpoint`, `keys.p256dh`, and `keys.auth`, and upsert by `(user_id, endpoint)`.
- The live subscription RLS policy allows a user to read only their own subscriptions. A server-side sender must authorize recipients first, then use a privileged server client for recipient subscription lookup; RLS must not be broadened.
- `visible_to` is an array on `messages`. Any central sender must select only the sender and explicitly listed recipients for restricted messages; it must never use group membership alone.
- Notification creation and push delivery should remain separate so provider failure does not delete the notification record.
- No idempotency constraint is currently proven in the live schema. A proposed dedupe migration must first report existing `(type, message_id, user_id)` duplicates and define a non-destructive remediation.

## Required transition evidence

Before choosing one owner for notification creation and one owner for push delivery, export the deployed Edge Function source, correlate recent `pg_net` response status by request ID, and run an isolated test for normal, restricted, empty-recipient, provider-failure, and retry cases. No production path was disabled in this phase.
