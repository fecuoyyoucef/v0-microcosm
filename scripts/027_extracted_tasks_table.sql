-- جدول لحفظ المهام المستخرجة من الرسائل
CREATE TABLE IF NOT EXISTS extracted_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  task_content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_extracted_tasks_group ON extracted_tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_extracted_tasks_status ON extracted_tasks(status);
CREATE INDEX IF NOT EXISTS idx_extracted_tasks_assigned ON extracted_tasks(assigned_to);

-- RLS policies
ALTER TABLE extracted_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their groups"
  ON extracted_tasks FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create tasks"
  ON extracted_tasks FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update their tasks"
  ON extracted_tasks FOR UPDATE
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );
