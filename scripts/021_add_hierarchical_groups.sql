-- Add hierarchical group support (primary/secondary cells)

-- Add new columns to groups table
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS parent_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS group_type TEXT DEFAULT 'primary' CHECK (group_type IN ('primary', 'secondary'));

-- Create index for parent_group_id
CREATE INDEX IF NOT EXISTS idx_groups_parent_group_id ON groups(parent_group_id);

-- Create supervisors table for secondary groups
CREATE TABLE IF NOT EXISTS group_supervisors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  permissions JSONB DEFAULT '{"can_delete_messages": false, "can_remove_members": false, "can_edit_settings": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS on supervisors
ALTER TABLE group_supervisors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supervisors
CREATE POLICY "supervisors_select" ON group_supervisors
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm WHERE gm.group_id = group_supervisors.group_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "supervisors_insert" ON group_supervisors
FOR INSERT WITH CHECK (
  -- Only primary group admin can assign supervisors
  EXISTS (
    SELECT 1 FROM groups g
    JOIN group_members gm ON gm.group_id = COALESCE(g.parent_group_id, g.id)
    WHERE g.id = group_supervisors.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  )
);

CREATE POLICY "supervisors_delete" ON group_supervisors
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM groups g
    JOIN group_members gm ON gm.group_id = COALESCE(g.parent_group_id, g.id)
    WHERE g.id = group_supervisors.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  )
);

-- Create group_join_requests table for handling overflow
CREATE TABLE IF NOT EXISTS group_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'redirected')),
  redirected_to UUID REFERENCES groups(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS for join requests
CREATE POLICY "join_requests_select" ON group_join_requests
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = group_join_requests.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  ) OR
  EXISTS (
    SELECT 1 FROM group_supervisors gs
    WHERE gs.group_id = group_join_requests.group_id 
    AND gs.user_id = auth.uid()
  )
);

CREATE POLICY "join_requests_insert" ON group_join_requests
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "join_requests_update" ON group_join_requests
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = group_join_requests.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  ) OR
  EXISTS (
    SELECT 1 FROM group_supervisors gs
    WHERE gs.group_id = group_join_requests.group_id 
    AND gs.user_id = auth.uid()
  )
);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE group_supervisors;
ALTER PUBLICATION supabase_realtime ADD TABLE group_join_requests;

-- Update max_members default to 15 for primary, 20 for secondary
-- This is handled in application logic
