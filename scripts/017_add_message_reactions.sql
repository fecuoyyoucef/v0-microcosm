-- إنشاء جدول التفاعلات على الرسائل
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, reaction)
);

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

-- تفعيل RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة - أعضاء المجموعة فقط
CREATE POLICY "Members can view reactions"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN group_members gm ON gm.group_id = m.group_id
      WHERE m.id = message_reactions.message_id
      AND gm.user_id = auth.uid()
    )
  );

-- سياسة الإضافة
CREATE POLICY "Members can add reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN group_members gm ON gm.group_id = m.group_id
      WHERE m.id = message_reactions.message_id
      AND gm.user_id = auth.uid()
    )
  );

-- سياسة الحذف
CREATE POLICY "Users can remove own reactions"
  ON message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- تفعيل Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
