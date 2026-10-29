# Production baseline

Date: 2026-10-29. Repository baseline: current `main` was inspected before this branch; no production resources were modified.

## Runtime and data sources

- Next.js App Router API routes run on Vercel.
- Supabase project `msmnwlanjykbumiihjjn` is the live database inspected read-only.
- The live database reports PostgreSQL 17, 88 public tables, and six recorded migrations. Two recorded migrations share the name `cell_questionnaires_mvp` with different versions.
- An active Edge Function named `send-message-notification` exists and has JWT verification enabled.
- Web Push subscriptions are stored in `public.push_subscriptions`; FCM tokens are stored separately in `public.fcm_tokens`.

## Relevant live counts

The read-only inventory returned: 26 profiles, 19 groups, 41 memberships, 6,664 messages, 9,088 notifications, 739 FCM tokens, 81 Web Push subscriptions, 26 collective-memory rows, 0 daily summaries, 0 extracted tasks, 0 extracted action items, 5 agents, and 11 AI agents.

These counts are inventory evidence only; no empty table is considered obsolete.

## Evidence limits

The live schema and policies were read through Supabase MCP. No INSERT, UPDATE, DELETE, DROP, ALTER, deployment, secret read, or migration was performed. Edge Function source was not available in the repository, so its deployed source and runtime behavior remain an operational dependency to export and review separately.
