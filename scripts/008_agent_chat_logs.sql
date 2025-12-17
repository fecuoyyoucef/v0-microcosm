-- جدول لتسجيل المحادثات مع الوكيل الرئيسي
CREATE TABLE IF NOT EXISTS agent_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index للأداء
CREATE INDEX IF NOT EXISTS idx_agent_chat_logs_user_id ON agent_chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_chat_logs_created_at ON agent_chat_logs(created_at DESC);

-- RLS Policies
ALTER TABLE agent_chat_logs ENABLE ROW LEVEL SECURITY;

-- المالك فقط يمكنه رؤية المحادثات
CREATE POLICY "Owners can view chat logs"
  ON agent_chat_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND admins.role = 'super_admin'
    )
  );

-- المالك فقط يمكنه إنشاء محادثات
CREATE POLICY "Owners can create chat logs"
  ON agent_chat_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND admins.role = 'super_admin'
    )
  );
