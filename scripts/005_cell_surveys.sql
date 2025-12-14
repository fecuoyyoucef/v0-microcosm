-- جدول استبيانات الخلايا
CREATE TABLE IF NOT EXISTS cell_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- نوع النقاش المفضل
  discussion_style TEXT, -- formal, casual, mixed
  
  -- المستوى المطلوب
  expertise_level TEXT, -- beginner, intermediate, advanced, mixed
  
  -- الهدف الأساسي
  primary_goal TEXT,
  
  -- أسلوب التفاعل
  interaction_style TEXT, -- collaborative, debate, brainstorming, structured
  
  -- وصف الأعضاء المثاليين
  ideal_member_description TEXT,
  
  -- الاهتمامات المستهدفة (من نفس قائمة المستخدم)
  target_interests TEXT[],
  
  -- معايير إضافية
  additional_criteria JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_cell_survey UNIQUE (group_id)
);

-- Enable RLS
ALTER TABLE cell_surveys ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Members can view cell survey"
  ON cell_surveys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = cell_surveys.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can insert cell survey"
  ON cell_surveys FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = cell_surveys.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

CREATE POLICY "Admin can update cell survey"
  ON cell_surveys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = cell_surveys.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_cell_surveys_group_id ON cell_surveys(group_id);
CREATE INDEX IF NOT EXISTS idx_cell_surveys_target_interests ON cell_surveys USING GIN(target_interests);
