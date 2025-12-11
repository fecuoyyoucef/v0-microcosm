-- Fix RLS policies for notebook_pages and notebook_contributions

-- First, enable RLS if not already enabled
ALTER TABLE IF EXISTS notebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notebook_contributions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS notebook_pages_select ON notebook_pages;
DROP POLICY IF EXISTS notebook_pages_insert ON notebook_pages;
DROP POLICY IF EXISTS notebook_pages_update ON notebook_pages;
DROP POLICY IF EXISTS notebook_pages_delete ON notebook_pages;

DROP POLICY IF EXISTS notebook_contributions_select ON notebook_contributions;
DROP POLICY IF EXISTS notebook_contributions_insert ON notebook_contributions;
DROP POLICY IF EXISTS notebook_contributions_update ON notebook_contributions;
DROP POLICY IF EXISTS notebook_contributions_delete ON notebook_contributions;

-- Create simple policies for notebook_pages
-- Select: members can view pages of their groups
CREATE POLICY notebook_pages_select ON notebook_pages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_members.group_id = notebook_pages.group_id 
    AND group_members.user_id = auth.uid()
  )
);

-- Insert: members can create pages in their groups
CREATE POLICY notebook_pages_insert ON notebook_pages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_members.group_id = notebook_pages.group_id 
    AND group_members.user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Update: creator or admin can update pages
CREATE POLICY notebook_pages_update ON notebook_pages
FOR UPDATE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_members.group_id = notebook_pages.group_id 
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);

-- Delete: creator or admin can delete pages
CREATE POLICY notebook_pages_delete ON notebook_pages
FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_members.group_id = notebook_pages.group_id 
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);

-- Create simple policies for notebook_contributions
-- Select: members can view contributions of pages in their groups
CREATE POLICY notebook_contributions_select ON notebook_contributions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM notebook_pages np
    JOIN group_members gm ON gm.group_id = np.group_id
    WHERE np.id = notebook_contributions.page_id 
    AND gm.user_id = auth.uid()
  )
);

-- Insert: members can add contributions to pages in their groups (if not locked)
CREATE POLICY notebook_contributions_insert ON notebook_contributions
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM notebook_pages np
    JOIN group_members gm ON gm.group_id = np.group_id
    WHERE np.id = notebook_contributions.page_id 
    AND gm.user_id = auth.uid()
    AND np.is_locked = false
  )
);

-- Update: creator can update their own contributions (if page not locked)
CREATE POLICY notebook_contributions_update ON notebook_contributions
FOR UPDATE USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM notebook_pages np
    WHERE np.id = notebook_contributions.page_id 
    AND np.is_locked = false
  )
);

-- Delete: creator or admin can delete contributions
CREATE POLICY notebook_contributions_delete ON notebook_contributions
FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM notebook_pages np
    JOIN group_members gm ON gm.group_id = np.group_id
    WHERE np.id = notebook_contributions.page_id 
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
  )
);
