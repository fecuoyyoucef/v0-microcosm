-- Cell Questionnaires (MVP)
-- Admin creates questionnaire with questions, members answer once, admin sees results.
-- NOTE: Named "questionnaires" to avoid clashing with cell_surveys (Synaptic Matching).

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.cell_questionnaires (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.cell_questionnaire_questions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.cell_questionnaires(id) on delete cascade,
  question_text text not null,
  -- MVP supports short text + single choice only. More types come later.
  question_type text not null check (question_type in ('short_text', 'single_choice')),
  options jsonb,            -- ["choice 1","choice 2",...] for single_choice
  sort_order int not null default 0
);

-- One response row per (user, questionnaire) — enforces single submission.
create table if not exists public.cell_questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.cell_questionnaires(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  unique (questionnaire_id, user_id)
);

create table if not exists public.cell_questionnaire_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.cell_questionnaire_responses(id) on delete cascade,
  question_id uuid not null references public.cell_questionnaire_questions(id) on delete cascade,
  answer_text text,         -- for short_text
  answer_choice text,       -- the chosen option (string) for single_choice
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_questionnaires_group on public.cell_questionnaires(group_id, status);
create index if not exists idx_questions_questionnaire on public.cell_questionnaire_questions(questionnaire_id, sort_order);
create index if not exists idx_responses_questionnaire on public.cell_questionnaire_responses(questionnaire_id, user_id);
create index if not exists idx_answers_response on public.cell_questionnaire_answers(response_id);

-- ============================================================
-- RLS
-- ============================================================

alter table public.cell_questionnaires enable row level security;
alter table public.cell_questionnaire_questions enable row level security;
alter table public.cell_questionnaire_responses enable row level security;
alter table public.cell_questionnaire_answers enable row level security;

-- Questionnaires: members can read, only group admins can write.
drop policy if exists "members can read questionnaires" on public.cell_questionnaires;
create policy "members can read questionnaires"
  on public.cell_questionnaires for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = cell_questionnaires.group_id
        and group_members.user_id = auth.uid()
    )
  );

drop policy if exists "admins can insert questionnaires" on public.cell_questionnaires;
create policy "admins can insert questionnaires"
  on public.cell_questionnaires for insert
  with check (
    exists (
      select 1 from public.group_members
      where group_members.group_id = cell_questionnaires.group_id
        and group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );

drop policy if exists "admins can update questionnaires" on public.cell_questionnaires;
create policy "admins can update questionnaires"
  on public.cell_questionnaires for update
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = cell_questionnaires.group_id
        and group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );

drop policy if exists "admins can delete questionnaires" on public.cell_questionnaires;
create policy "admins can delete questionnaires"
  on public.cell_questionnaires for delete
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = cell_questionnaires.group_id
        and group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );

-- Questions: visibility mirrors the parent questionnaire.
drop policy if exists "members can read questions" on public.cell_questionnaire_questions;
create policy "members can read questions"
  on public.cell_questionnaire_questions for select
  using (
    exists (
      select 1 from public.cell_questionnaires q
      join public.group_members gm on gm.group_id = q.group_id
      where q.id = cell_questionnaire_questions.questionnaire_id
        and gm.user_id = auth.uid()
    )
  );

drop policy if exists "admins can manage questions" on public.cell_questionnaire_questions;
create policy "admins can manage questions"
  on public.cell_questionnaire_questions for all
  using (
    exists (
      select 1 from public.cell_questionnaires q
      join public.group_members gm on gm.group_id = q.group_id
      where q.id = cell_questionnaire_questions.questionnaire_id
        and gm.user_id = auth.uid()
        and gm.role = 'admin'
    )
  );

-- Responses: members of the cell can read all responses (results are non-anonymous in MVP).
-- A user can only insert their own response.
drop policy if exists "members can read responses" on public.cell_questionnaire_responses;
create policy "members can read responses"
  on public.cell_questionnaire_responses for select
  using (
    exists (
      select 1 from public.cell_questionnaires q
      join public.group_members gm on gm.group_id = q.group_id
      where q.id = cell_questionnaire_responses.questionnaire_id
        and gm.user_id = auth.uid()
    )
  );

drop policy if exists "users can submit own response" on public.cell_questionnaire_responses;
create policy "users can submit own response"
  on public.cell_questionnaire_responses for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.cell_questionnaires q
      join public.group_members gm on gm.group_id = q.group_id
      where q.id = cell_questionnaire_responses.questionnaire_id
        and gm.user_id = auth.uid()
        and q.status = 'open'
    )
  );

-- Answers: members can read, owner of the parent response can insert.
drop policy if exists "members can read answers" on public.cell_questionnaire_answers;
create policy "members can read answers"
  on public.cell_questionnaire_answers for select
  using (
    exists (
      select 1 from public.cell_questionnaire_responses r
      join public.cell_questionnaires q on q.id = r.questionnaire_id
      join public.group_members gm on gm.group_id = q.group_id
      where r.id = cell_questionnaire_answers.response_id
        and gm.user_id = auth.uid()
    )
  );

drop policy if exists "users can insert own answers" on public.cell_questionnaire_answers;
create policy "users can insert own answers"
  on public.cell_questionnaire_answers for insert
  with check (
    exists (
      select 1 from public.cell_questionnaire_responses r
      where r.id = cell_questionnaire_answers.response_id
        and r.user_id = auth.uid()
    )
  );
