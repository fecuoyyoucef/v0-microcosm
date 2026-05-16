-- =============================================================================
-- Unified agents system schema
--
-- Idempotent: safe to re-run. Replaces the legacy 007/008/034 agent scripts.
-- =============================================================================

-- Per-agent enable/disable + auto-execute policy override.
create table if not exists public.agent_settings (
  agent_id text primary key,
  enabled boolean not null default true,
  auto_execute boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- One row per agent decision (the model's structured output for a scenario).
create table if not exists public.agent_decisions (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  scenario text not null,
  decision jsonb not null,
  confidence integer,
  severity text check (severity in ('low','medium','high','critical')),
  context jsonb,
  created_at timestamptz not null default now()
);
create index if not exists agent_decisions_agent_idx on public.agent_decisions(agent_id, created_at desc);

-- Every executed action (success or failure). Holds the snapshot used by undo.
create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  decision_id uuid references public.agent_decisions(id) on delete set null,
  action_type text not null,
  target_id text,
  before_snapshot jsonb,
  reasoning text,
  confidence integer,
  severity text check (severity in ('low','medium','high','critical')),
  context jsonb,
  status text not null default 'completed' check (status in ('completed','undone','failed')),
  undone_at timestamptz,
  undone_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists agent_actions_status_idx on public.agent_actions(status, created_at desc);
create index if not exists agent_actions_agent_idx on public.agent_actions(agent_id, created_at desc);

-- Approval workflow for high-risk actions.
create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  description text not null,
  risk_level text not null check (risk_level in ('low','medium','high','critical')),
  requested_by text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_by text,
  approved_at timestamptz,
  executed_at timestamptz,
  execution_result jsonb,
  created_at timestamptz not null default now()
);
create index if not exists approval_requests_status_idx on public.approval_requests(status, created_at desc);

-- Individual tool calls (one row per tool invocation, even within a single run).
create table if not exists public.tool_executions (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid references public.agent_decisions(id) on delete set null,
  agent_id text,
  tool_name text not null,
  args jsonb not null default '{}'::jsonb,
  result jsonb,
  success boolean not null default false,
  error_message text,
  execution_time_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists tool_executions_tool_idx on public.tool_executions(tool_name, created_at desc);

-- One row per `runAgent` invocation — useful for cost/perf monitoring.
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  scenario text not null,
  ok boolean not null,
  steps integer not null default 0,
  total_tokens integer not null default 0,
  duration_ms integer not null default 0,
  final_output text,
  error text,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists agent_runs_agent_idx on public.agent_runs(agent_id, created_at desc);

-- Long-term memory: prefs, lessons learned, owner overrides.
create table if not exists public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  memory_type text not null,
  content jsonb not null,
  importance numeric default 1,
  created_at timestamptz not null default now()
);
create index if not exists agent_memory_agent_idx on public.agent_memory(agent_id, importance desc, created_at desc);

-- =============================================================================
-- RLS: only the owner sees this data (admin endpoints use service role anyway).
-- =============================================================================

alter table public.agent_settings    enable row level security;
alter table public.agent_decisions   enable row level security;
alter table public.agent_actions     enable row level security;
alter table public.approval_requests enable row level security;
alter table public.tool_executions   enable row level security;
alter table public.agent_runs        enable row level security;
alter table public.agent_memory      enable row level security;

-- Drop+recreate so policies stay in sync with code expectations on re-run.
drop policy if exists agent_settings_owner    on public.agent_settings;
drop policy if exists agent_decisions_owner   on public.agent_decisions;
drop policy if exists agent_actions_owner     on public.agent_actions;
drop policy if exists approval_requests_owner on public.approval_requests;
drop policy if exists tool_executions_owner   on public.tool_executions;
drop policy if exists agent_runs_owner        on public.agent_runs;
drop policy if exists agent_memory_owner      on public.agent_memory;

-- Service role (used by all agent code) bypasses RLS automatically.
-- These policies only matter for direct access from the client.
create policy agent_settings_owner    on public.agent_settings    for all to authenticated using (false);
create policy agent_decisions_owner   on public.agent_decisions   for all to authenticated using (false);
create policy agent_actions_owner     on public.agent_actions     for all to authenticated using (false);
create policy approval_requests_owner on public.approval_requests for all to authenticated using (false);
create policy tool_executions_owner   on public.tool_executions   for all to authenticated using (false);
create policy agent_runs_owner        on public.agent_runs        for all to authenticated using (false);
create policy agent_memory_owner      on public.agent_memory      for all to authenticated using (false);

-- Seed defaults so the UI has something to render before the owner toggles anything.
insert into public.agent_settings (agent_id, enabled, auto_execute) values
  ('chief',     true,  false),
  ('moderator', true,  false),
  ('support',   true,  false),
  ('analyst',   true,  true),
  ('developer', false, false)
on conflict (agent_id) do nothing;
