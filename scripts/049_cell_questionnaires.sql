-- =====================================================
-- 049_cell_questionnaires.sql
--
-- نظام الاستبيانات داخل الخلية (Cell Questionnaires).
-- مسؤول الخلية (group_members.role = 'admin') ينشئ،
-- وجميع أعضاء الخلية يجيبون.
--
-- شغّل هذا الملف من واجهة Supabase SQL Editor.
-- =====================================================

-- 1) الاستبيانات (واحد أو أكثر لكل مجموعة)
CREATE TABLE IF NOT EXISTS public.cell_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed')),
  anonymous BOOLEAN NOT NULL DEFAULT false,
  allow_multiple_responses BOOLEAN NOT NULL DEFAULT false,
  closes_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cell_questionnaires_group_id
  ON public.cell_questionnaires(group_id);
CREATE INDEX IF NOT EXISTS idx_cell_questionnaires_status
  ON public.cell_questionnaires(group_id, status);

-- 2) الأسئلة (مرتّبة بـ position)
CREATE TABLE IF NOT EXISTS public.cell_questionnaire_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL
    REFERENCES public.cell_questionnaires(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL
    CHECK (question_type IN ('short_text', 'long_text', 'single_choice', 'multiple_choice')),
  options JSONB NOT NULL DEFAULT '[]'::JSONB, -- مصفوفة نصوص لأسئلة الاختيار
  is_required BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_qid
  ON public.cell_questionnaire_questions(questionnaire_id, position);

-- 3) الردود (صف واحد لكل مستخدم في كل استبيان)
CREATE TABLE IF NOT EXISTS public.cell_questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL
    REFERENCES public.cell_questionnaires(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(questionnaire_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_qid
  ON public.cell_questionnaire_responses(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user
  ON public.cell_questionnaire_responses(user_id);

-- 4) الإجابات (صف لكل سؤال داخل الرد)
CREATE TABLE IF NOT EXISTS public.cell_questionnaire_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL
    REFERENCES public.cell_questionnaire_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL
    REFERENCES public.cell_questionnaire_questions(id) ON DELETE CASCADE,
  answer_text TEXT,                          -- للنص القصير والطويل
  selected_options JSONB DEFAULT '[]'::JSONB, -- للاختيار الواحد/المتعدد
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(response_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_answers_response
  ON public.cell_questionnaire_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_answers_question
  ON public.cell_questionnaire_answers(question_id);

-- =====================================================
-- RLS - حماية البيانات على مستوى الصف
-- =====================================================
ALTER TABLE public.cell_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_questionnaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_questionnaire_answers ENABLE ROW LEVEL SECURITY;

-- تنظيف السياسات القديمة لو أعيد التشغيل
DROP POLICY IF EXISTS "questionnaires_select_members" ON public.cell_questionnaires;
DROP POLICY IF EXISTS "questionnaires_insert_admin" ON public.cell_questionnaires;
DROP POLICY IF EXISTS "questionnaires_update_admin" ON public.cell_questionnaires;
DROP POLICY IF EXISTS "questionnaires_delete_admin" ON public.cell_questionnaires;
DROP POLICY IF EXISTS "qquestions_select_members" ON public.cell_questionnaire_questions;
DROP POLICY IF EXISTS "qquestions_modify_admin" ON public.cell_questionnaire_questions;
DROP POLICY IF EXISTS "qresponses_select_self_or_admin" ON public.cell_questionnaire_responses;
DROP POLICY IF EXISTS "qresponses_insert_self" ON public.cell_questionnaire_responses;
DROP POLICY IF EXISTS "qresponses_delete_self" ON public.cell_questionnaire_responses;
DROP POLICY IF EXISTS "qanswers_select_self_or_admin" ON public.cell_questionnaire_answers;
DROP POLICY IF EXISTS "qanswers_insert_self" ON public.cell_questionnaire_answers;
DROP POLICY IF EXISTS "qanswers_delete_self" ON public.cell_questionnaire_answers;

-- الاستبيانات: أي عضو في المجموعة يقرأ
CREATE POLICY "questionnaires_select_members" ON public.cell_questionnaires
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = cell_questionnaires.group_id
        AND gm.user_id = auth.uid()
    )
  );

-- الاستبيانات: فقط المسؤول ينشئ
CREATE POLICY "questionnaires_insert_admin" ON public.cell_questionnaires
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = cell_questionnaires.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- الاستبيانات: فقط المسؤول يعدّل
CREATE POLICY "questionnaires_update_admin" ON public.cell_questionnaires
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = cell_questionnaires.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- الاستبيانات: فقط المسؤول يحذف
CREATE POLICY "questionnaires_delete_admin" ON public.cell_questionnaires
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = cell_questionnaires.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- الأسئلة: تظهر لأعضاء المجموعة
CREATE POLICY "qquestions_select_members" ON public.cell_questionnaire_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cell_questionnaires q
      JOIN public.group_members gm ON gm.group_id = q.group_id
      WHERE q.id = cell_questionnaire_questions.questionnaire_id
        AND gm.user_id = auth.uid()
    )
  );

-- الأسئلة: فقط المسؤول يضيف/يعدّل/يحذف
CREATE POLICY "qquestions_modify_admin" ON public.cell_questionnaire_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cell_questionnaires q
      JOIN public.group_members gm ON gm.group_id = q.group_id
      WHERE q.id = cell_questionnaire_questions.questionnaire_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cell_questionnaires q
      JOIN public.group_members gm ON gm.group_id = q.group_id
      WHERE q.id = cell_questionnaire_questions.questionnaire_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- الردود: كل عضو يقرأ رده، والمسؤول يقرأ كل الردود في خليته
CREATE POLICY "qresponses_select_self_or_admin" ON public.cell_questionnaire_responses
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cell_questionnaires q
      JOIN public.group_members gm ON gm.group_id = q.group_id
      WHERE q.id = cell_questionnaire_responses.questionnaire_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- الردود: عضو المجموعة فقط يستطيع إضافة رده، وفقط للاستبيانات المنشورة
CREATE POLICY "qresponses_insert_self" ON public.cell_questionnaire_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cell_questionnaires q
      JOIN public.group_members gm ON gm.group_id = q.group_id
      WHERE q.id = cell_questionnaire_responses.questionnaire_id
        AND gm.user_id = auth.uid()
        AND q.status = 'published'
        AND (q.closes_at IS NULL OR q.closes_at > NOW())
    )
  );

-- الردود: المستخدم يحذف رده الشخصي
CREATE POLICY "qresponses_delete_self" ON public.cell_questionnaire_responses
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- الإجابات: قراءتها مرتبطة بقراءة الرد الأم
CREATE POLICY "qanswers_select_self_or_admin" ON public.cell_questionnaire_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cell_questionnaire_responses r
      WHERE r.id = cell_questionnaire_answers.response_id
        AND (
          r.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.cell_questionnaires q
            JOIN public.group_members gm ON gm.group_id = q.group_id
            WHERE q.id = r.questionnaire_id
              AND gm.user_id = auth.uid()
              AND gm.role = 'admin'
          )
        )
    )
  );

-- الإجابات: إدخالها فقط في ردك أنت
CREATE POLICY "qanswers_insert_self" ON public.cell_questionnaire_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cell_questionnaire_responses r
      WHERE r.id = cell_questionnaire_answers.response_id
        AND r.user_id = auth.uid()
    )
  );

-- الإجابات: حذف إجابتك أنت
CREATE POLICY "qanswers_delete_self" ON public.cell_questionnaire_answers
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cell_questionnaire_responses r
      WHERE r.id = cell_questionnaire_answers.response_id
        AND r.user_id = auth.uid()
    )
  );

-- محدّث تلقائي
CREATE OR REPLACE FUNCTION public.set_cell_questionnaire_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cell_questionnaires_updated_at ON public.cell_questionnaires;
CREATE TRIGGER trg_cell_questionnaires_updated_at
  BEFORE UPDATE ON public.cell_questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.set_cell_questionnaire_updated_at();
