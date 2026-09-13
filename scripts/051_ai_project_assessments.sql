create table if not exists public.project_assessments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  assessed_by uuid references auth.users(id) on delete set null,
  responsibility_score integer not null check (responsibility_score between 0 and 100),
  progress_score integer not null check (progress_score between 0 and 100),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  responsibility_summary text not null,
  progress_summary text not null,
  behavior jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  source_message_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_assessments_group_created_idx
  on public.project_assessments(group_id, created_at desc);

alter table public.project_assessments enable row level security;

create policy "Members can read project assessments"
  on public.project_assessments for select
  using (exists (
    select 1 from public.group_members gm
    where gm.group_id = project_assessments.group_id
      and gm.user_id = auth.uid()
  ));

create policy "Members can create project assessments"
  on public.project_assessments for insert
  with check (assessed_by = auth.uid() and exists (
    select 1 from public.group_members gm
    where gm.group_id = project_assessments.group_id
      and gm.user_id = auth.uid()
  ));
