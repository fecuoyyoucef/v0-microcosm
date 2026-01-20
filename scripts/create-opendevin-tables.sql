-- OpenDevin Tasks Tracking Table
CREATE TABLE IF NOT EXISTS opendevin_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  instruction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  project_path TEXT,
  max_iterations INTEGER DEFAULT 30,
  result JSONB,
  error TEXT,
  logs TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opendevin_tasks_user_id ON opendevin_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_opendevin_tasks_task_id ON opendevin_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_opendevin_tasks_status ON opendevin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_opendevin_tasks_created_at ON opendevin_tasks(created_at DESC);

-- RLS Policies
ALTER TABLE opendevin_tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tasks
CREATE POLICY opendevin_tasks_select_policy ON opendevin_tasks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only admins can insert tasks
CREATE POLICY opendevin_tasks_insert_policy ON opendevin_tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can update their own tasks
CREATE POLICY opendevin_tasks_update_policy ON opendevin_tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Only admins can delete tasks
CREATE POLICY opendevin_tasks_delete_policy ON opendevin_tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_opendevin_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_opendevin_tasks_updated_at_trigger
  BEFORE UPDATE ON opendevin_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_opendevin_tasks_updated_at();

COMMIT;
