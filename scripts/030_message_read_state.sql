-- Rebuild of the read-receipt ("seen") system from scratch.
--
-- The previous approach stored one row per (message, user) in message_reads
-- and relied on realtime events from that table. The fatal flaw: message_reads
-- was never added to the supabase_realtime publication, so the sender's
-- subscription never fired and the second tick never lit up.
--
-- New design: a single cursor row per (group, user) holding last_read_at.
-- A message is "read" by someone if their last_read_at >= the message's
-- created_at. This is lighter (one row per member instead of per message)
-- and trivially supports realtime.

create table if not exists public.message_read_state (
  group_id     uuid not null references public.groups (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists message_read_state_group_idx
  on public.message_read_state (group_id);

-- Enable RLS.
alter table public.message_read_state enable row level security;

-- A member can read the read-state of every member in groups they belong to
-- (needed so the sender can see when the recipient has caught up).
drop policy if exists "members read group read-state" on public.message_read_state;
create policy "members read group read-state"
  on public.message_read_state
  for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = message_read_state.group_id
        and gm.user_id = auth.uid()
    )
  );

-- A member can upsert ONLY their own cursor row.
drop policy if exists "members write own read-state" on public.message_read_state;
create policy "members write own read-state"
  on public.message_read_state
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "members update own read-state" on public.message_read_state;
create policy "members update own read-state"
  on public.message_read_state
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- THE CRITICAL FIX: publish the table for realtime and emit full row data
-- so the sender's subscription receives last_read_at on every change.
alter table public.message_read_state replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'message_read_state'
  ) then
    alter publication supabase_realtime add table public.message_read_state;
  end if;
end $$;
