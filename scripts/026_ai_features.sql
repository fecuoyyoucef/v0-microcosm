-- جداول جديدة لميزات AI

-- جدول سجلات الفحص (Content Moderation)
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reason TEXT,
  severity INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول تصنيف الرسائل التلقائي
CREATE TABLE IF NOT EXISTS message_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  classification_type TEXT NOT NULL, -- question, decision, idea, discussion, other
  confidence DECIMAL(3,2) DEFAULT 0.50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id)
);

-- جدول المهام المستخرجة
CREATE TABLE IF NOT EXISTS extracted_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  node_id UUID REFERENCES conversation_nodes(id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  source_message_ids UUID[],
  status TEXT DEFAULT 'pending', -- pending, in_progress, done
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_moderation_logs_user ON moderation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_group ON moderation_logs(group_id);
CREATE INDEX IF NOT EXISTS idx_message_classifications_message ON message_classifications(message_id);
CREATE INDEX IF NOT EXISTS idx_action_items_group ON extracted_action_items(group_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON extracted_action_items(status);

-- RLS Policies
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_action_items ENABLE ROW LEVEL SECURITY;

-- Admins only can see moderation logs
CREATE POLICY "Admins can view moderation logs" ON moderation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Anyone can view their own message classifications
CREATE POLICY "Users can view classifications" ON message_classifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages 
      WHERE messages.id = message_classifications.message_id 
      AND messages.sender_id = auth.uid()
    )
  );

-- Group members can view action items
CREATE POLICY "Members can view action items" ON extracted_action_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = extracted_action_items.group_id 
      AND group_members.user_id = auth.uid()
    )
  );

-- Group admins can insert/update/delete action items
CREATE POLICY "Admins can manage action items" ON extracted_action_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = extracted_action_items.group_id 
      AND group_members.user_id = auth.uid()
      AND group_members.role IN ('admin', 'moderator')
    )
  );
