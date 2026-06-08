-- Meetings feature: admin-scheduled meetings with timed push reminders.
-- (Already applied to the live database; kept here for repo parity.)

create table if not exists public.meetings (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.groups (id) on delete cascade,
  created_by      uuid not null references auth.users (id) on delete cascade,
  title           text not null default 'اجتماع',
  starts_at       timestamptz not null,
  duration_min    integer,                            -- optional; null = open-ended
  status          text not null default 'scheduled',  -- scheduled | active | ended | cancelled
  reminder_sent_at timestamptz,                       -- 5-min-before push dispatched
  started_sent_at  timestamptz,                        -- start push dispatched / set active
  ended_sent_at    timestamptz,                        -- end push dispatched / set ended
  created_at      timestamptz not null default now()
);
create index if not exists meetings_group_idx   on public.meetings (group_id);
create index if not exists meetings_status_idx  on public.meetings (status);
create index if not exists meetings_starts_idx  on public.meetings (starts_at);

-- One row per (meeting,user) once the user dismisses/enters the cell so the
-- repeating alarm knows to stop for that user.
create table if not exists public.meeting_alarm_state (
  meeting_id      uuid not null references public.meetings (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

-- RLS: meetings ---------------------------------------------------------------
alter table public.meetings enable row level security;

drop policy if exists "members read group meetings" on public.meetings;
create policy "members read group meetings" on public.meetings for select to authenticated
  using (exists (select 1 from public.group_members gm
                 where gm.group_id = meetings.group_id and gm.user_id = auth.uid()));

drop policy if exists "admins create meetings" on public.meetings;
create policy "admins create meetings" on public.meetings for insert to authenticated
  with check (exists (select 1 from public.group_members gm
                      where gm.group_id = meetings.group_id
                        and gm.user_id = auth.uid() and gm.role = 'admin'));

drop policy if exists "admins update meetings" on public.meetings;
create policy "admins update meetings" on public.meetings for update to authenticated
  using (exists (select 1 from public.group_members gm
                 where gm.group_id = meetings.group_id
                   and gm.user_id = auth.uid() and gm.role = 'admin'))
  with check (exists (select 1 from public.group_members gm
                      where gm.group_id = meetings.group_id
                        and gm.user_id = auth.uid() and gm.role = 'admin'));

-- RLS: meeting_alarm_state ----------------------------------------------------
alter table public.meeting_alarm_state enable row level security;

drop policy if exists "members read alarm state" on public.meeting_alarm_state;
create policy "members read alarm state" on public.meeting_alarm_state for select to authenticated
  using (exists (select 1 from public.meetings m
                 join public.group_members gm on gm.group_id = m.group_id
                 where m.id = meeting_alarm_state.meeting_id and gm.user_id = auth.uid()));

drop policy if exists "members write own alarm state" on public.meeting_alarm_state;
create policy "members write own alarm state" on public.meeting_alarm_state for insert to authenticated
  with check (user_id = auth.uid());

-- Realtime --------------------------------------------------------------------
alter table public.meetings            replica identity full;
alter table public.meeting_alarm_state replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='meetings') then
    alter publication supabase_realtime add table public.meetings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='meeting_alarm_state') then
    alter publication supabase_realtime add table public.meeting_alarm_state;
  end if;
end $$;

-- Per-minute scheduler (pg_cron + pg_net) -------------------------------------
-- Calls the dispatch endpoint so reminders fire even when every client is closed.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare jid bigint;
begin
  for jid in select jobid from cron.job where jobname = 'meeting-dispatch' loop
    perform cron.unschedule(jid);
  end loop;
end $$;

select cron.schedule(
  'meeting-dispatch',
  '* * * * *',
  $cmd$
  select net.http_post(
    url     := 'https://v0-synaptic-space.vercel.app/api/meetings/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer meet_dispatch_cron_synaptic_2026'
    ),
    body    := '{}'::jsonb
  );
  $cmd$
);
