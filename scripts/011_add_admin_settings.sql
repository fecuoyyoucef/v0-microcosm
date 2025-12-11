-- إضافة عمود لإعدادات المجموعة
ALTER TABLE groups ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "upper_layer_permission": "admin_only",
  "allow_notebook": true,
  "allow_mindmap": true,
  "allow_smart_summary": true
}'::jsonb;

-- إضافة عمود للرسائل المثبتة
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- إضافة جدول لتتبع نشاط المجموعة (للإحصائيات)
CREATE TABLE IF NOT EXISTS group_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('message', 'join', 'leave', 'pin', 'delete_message', 'update_settings')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_group_activity_log_group_id ON group_activity_log(group_id);
CREATE INDEX IF NOT EXISTS idx_group_activity_log_created_at ON group_activity_log(created_at DESC);

-- سياسات RLS لجدول النشاط
ALTER TABLE group_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_select" ON group_activity_log
FOR SELECT TO authenticated USING (true);

CREATE POLICY "activity_log_insert" ON group_activity_log
FOR INSERT TO authenticated WITH CHECK (true);
