# Database inventory

## Notification and messaging tables

| Table | Live shape / policy | Code usage | Decision |
|---|---|---|---|
| `messages` | `id`, `group_id`, `sender_id`, `content`, `visible_to`, `reply_to`, timestamps; RLS enabled | Chat queries and inserts; trigger `on_message_created` | Keep as source of message truth; `visible_to` must be enforced in every notification consumer |
| `notifications` | `user_id`, `type`, `title`, `body`, `data`, `group_id`, `sender_id`, `message_id`, read state; RLS enabled | `/api/notifications/*`, chat notification flow, Edge Function | Keep; dedupe requires a reviewed unique/index strategy because existing rows were not modified |
| `push_subscriptions` | `user_id`, `endpoint`, `p256dh`, `auth`, timestamps; RLS enabled; owner-only read | `/api/push/subscribe`, Web Push sender | Keep; one user may have multiple endpoints; conflict key is `(user_id, endpoint)` |
| `fcm_tokens` | `user_id`, `token`, device metadata and timestamps; RLS enabled; owner-only policy | Firebase send routes | Keep separate from Web Push: different provider and credential model |
| `group_members` | `group_id`, `user_id`, `role`; live policies are permissive and need a later security migration | Membership and recipient authorization | Do not change in this phase; review in Phase 2 |

## Parallel models

- `collective_memory` has live data; `daily_summaries` is empty in this snapshot. They are not proven duplicates.
- `extracted_tasks` and `extracted_action_items` are both empty; no merge or deletion is justified.
- `agents` and `ai_agents` both contain data and must be mapped to screens and agent code before any consolidation.
- `feature_flags` and `feature_registry`, and `message_reads` and `message_read_state`, require a complete code/trigger map before a decision.

## Triggers and functions

Live triggers include `on_message_created` calling `notify_new_message()` and `on_new_message_unread` calling `increment_unread_counts()`. Both functions are `SECURITY DEFINER`; their `search_path`, execution grants, and service-to-function authentication are Phase 2 work.

## Drift observed

The repository's Web Push route previously wrote a non-existent `subscription` column and conflicted on `user_id` alone. The live table instead stores normalized endpoint/key columns and permits multiple devices per user. The live database has six migrations while the repository contains more numbered SQL scripts; no assumption was made that every script was applied.
