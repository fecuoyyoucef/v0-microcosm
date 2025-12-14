-- Synaptic Matching System
-- نظام المطابقة المشبكية

-- 1. جدول لحفظ درجات التوافق المحسوبة (كاش)
CREATE TABLE IF NOT EXISTS synaptic_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  compatibility_score DECIMAL(5,2) NOT NULL DEFAULT 0, -- 0-100
  interests_score DECIMAL(5,2) DEFAULT 0,
  level_score DECIMAL(5,2) DEFAULT 0,
  goal_score DECIMAL(5,2) DEFAULT 0,
  style_score DECIMAL(5,2) DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- 2. تحديث جدول user_surveys لإضافة حقول إضافية للمطابقة
ALTER TABLE user_surveys ADD COLUMN IF NOT EXISTS cognitive_style TEXT;
ALTER TABLE user_surveys ADD COLUMN IF NOT EXISTS expertise_level TEXT;
ALTER TABLE user_surveys ADD COLUMN IF NOT EXISTS interaction_preference TEXT;

-- 3. تحديث جدول cell_surveys لضمان وجود الحقول
ALTER TABLE cell_surveys ADD COLUMN IF NOT EXISTS min_responsibility_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE cell_surveys ADD COLUMN IF NOT EXISTS require_survey_completion BOOLEAN DEFAULT false;

-- 4. إضافة إعداد النظام للمطابقة المشبكية
INSERT INTO system_settings (key, value, description)
VALUES ('synaptic_matching_enabled', 'false', 'تفعيل نظام المطابقة المشبكية الذكية')
ON CONFLICT (key) DO NOTHING;

-- 5. RLS للجدول الجديد
ALTER TABLE synaptic_matches ENABLE ROW LEVEL SECURITY;

-- المستخدم يمكنه رؤية مطابقاته فقط
CREATE POLICY "Users can view own matches"
  ON synaptic_matches FOR SELECT
  USING (auth.uid() = user_id);

-- أصحاب الخلايا يمكنهم رؤية مطابقات خلاياهم
CREATE POLICY "Group owners can view group matches"
  ON synaptic_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = synaptic_matches.group_id
      AND g.created_by = auth.uid()
    )
  );

-- النظام يمكنه إدارة المطابقات
CREATE POLICY "System can manage matches"
  ON synaptic_matches FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Index للأداء
CREATE INDEX IF NOT EXISTS idx_synaptic_matches_user ON synaptic_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_synaptic_matches_group ON synaptic_matches(group_id);
CREATE INDEX IF NOT EXISTS idx_synaptic_matches_score ON synaptic_matches(compatibility_score DESC);
