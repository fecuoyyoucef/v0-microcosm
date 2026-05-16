-- =====================================================================
-- Unified Agents System schema (Groq-powered)
-- Idempotent: safe to re-run. Replaces the scattered 007/008/034 tables.
-- =====================================================================

-- ---- Agents catalogue --------------------------------------------------
create table if not exists public.agents (
  id text primary key,                       -- "chief", "moderator", ...
  name text not null,
  description text,
  model text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- Per-agent runs (one row per invocation) --------------------------
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.agents(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  trigger text not null,                     -- "manual" | "cron" | "event" | "user"
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  status text not null default 'running'
    check (status in ('running','completed','failed','cancelled')),
  steps integer not null default 0,
  tokens_used integer not null default 0,
  duration_ms integer,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists agent_runs_agent_started_idx
  on public.agent_runs (agent_id, started_at desc);
create index if not exists agent_runs_status_idx
  on public.agent_runs (status) where status = 'running';

-- ---- Individual tool calls inside a run -------------------------------
create table if not exists public.agent_tool_calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  agent_id text not null,
  tool_name text not null,
  arguments jsonb not null default '{}'::jsonb,
  result jsonb,
  success boolean,
  error text,
  duration_ms integer,
  required_approval boolean not null default false,
  approval_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists agent_tool_calls_run_idx
  on public.agent_tool_calls (run_id, created_at);

-- ---- Approval requests for risky tool calls ---------------------------
create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.agent_runs(id) on delete set null,
  agent_id text not null,
  tool_name text not null,
  arguments jsonb not null default '{}'::jsonb,
  risk_level text not null default 'medium'
    check (risk_level in ('low','medium','high','critical')),
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','expired')),
  reason text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists agent_approvals_pending_idx
  on public.agent_approvals (status, requested_at desc)
  where status = 'pending';

-- ---- Undo snapshots (state before destructive action) -----------------
create table if not exists public.agent_snapshots (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.agent_runs(id) on delete set null,
  agent_id text not null,
  resource_type text not null,               -- "message" | "user" | "group" | ...
  resource_id text not null,
  before_state jsonb not null,
  reverted boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists agent_snapshots_resource_idx
  on public.agent_snapshots (resource_type, resource_id);

-- ---- Long-lived agent memory -----------------------------------------
create table if not exists public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.agents(id) on delete cascade,
  key text not null,
  value jsonb not null,
  scope text not null default 'global'
    check (scope in ('global','user','group')),
  scope_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, key, scope, scope_id)
);
create index if not exists agent_memory_lookup_idx
  on public.agent_memory (agent_id, scope, scope_id);

-- ---- Seed the five built-in agents -----------------------------------
insert into public.agents (id, name, description, model) values
  ('chief',     'الوكيل الرئيسي',  'يُوجّه ويتخذ القرارات عالية المستوى',  'llama-3.3-70b-versatile'),
  ('moderator', 'وكيل الإشراف',    'مراقبة المحتوى وإدارة الانتهاكات',      'llama-3.1-8b-instant'),
  ('support',   'وكيل الدعم',      'الإجابة على المستخدمين وحل التذاكر',    'llama-3.1-8b-instant'),
  ('analyst',   'وكيل التحليلات',  'تحليل النشاط والاتجاهات',               'llama-3.3-70b-versatile'),
  ('developer', 'وكيل التطوير',    'تحليل الأخطاء وفتح PRs',                'llama-3.3-70b-versatile')
on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      model = excluded.model,
      updated_at = now();

-- ---- RLS: admin-only access ------------------------------------------
alter table public.agents              enable row level security;
alter table public.agent_runs          enable row level security;
alter table public.agent_tool_calls    enable row level security;
alter table public.agent_approvals     enable row level security;
alter table public.agent_snapshots     enable row level security;
alter table public.agent_memory        enable row level security;

-- Helper: is the current user an admin? Mirrors what the app already checks.
create or replace function public.is_agent_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'agents','agent_runs','agent_tool_calls',
      'agent_approvals','agent_snapshots','agent_memory'
    ])
  loop
    execute format('drop policy if exists %I_admin_all on public.%I', t, t);
    execute format(
      'create policy %I_admin_all on public.%I for all to authenticated '
      'using (public.is_agent_admin()) with check (public.is_agent_admin())',
      t, t
    );
  end loop;
end $$;
