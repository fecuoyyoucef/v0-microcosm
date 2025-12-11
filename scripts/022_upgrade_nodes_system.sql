-- Upgrade conversation_nodes for hierarchical structure
-- Script 022: Enhanced Nodes System

-- 1. Add node_type column to distinguish primary vs secondary nodes
ALTER TABLE conversation_nodes 
ADD COLUMN IF NOT EXISTS node_type TEXT DEFAULT 'primary' CHECK (node_type IN ('primary', 'secondary'));

-- 2. Add icon column for primary nodes
ALTER TABLE conversation_nodes 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'folder';

-- 3. Add order column for sorting
ALTER TABLE conversation_nodes 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 4. Add is_default flag for default primary nodes
ALTER TABLE conversation_nodes 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- 5. Create table for node AI summaries (only for primary nodes)
CREATE TABLE IF NOT EXISTS node_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES conversation_nodes(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  summary TEXT NOT NULL,
  key_points JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',
  questions JSONB DEFAULT '[]',
  discussions JSONB DEFAULT '[]',
  message_count INTEGER DEFAULT 0,
  sub_nodes_summary JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(node_id)
);

-- 6. Enable RLS on node_summaries
ALTER TABLE node_summaries ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for node_summaries
CREATE POLICY "node_summaries_select" ON node_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = node_summaries.group_id 
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "node_summaries_insert" ON node_summaries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = node_summaries.group_id 
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "node_summaries_update" ON node_summaries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = node_summaries.group_id 
      AND gm.user_id = auth.uid()
    )
  );

-- 8. Enable realtime for node_summaries
ALTER PUBLICATION supabase_realtime ADD TABLE node_summaries;

-- 9. Function to get messages count per node
CREATE OR REPLACE FUNCTION get_node_message_count(p_node_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER 
  FROM messages 
  WHERE node_id = p_node_id;
$$ LANGUAGE SQL STABLE;

-- 10. Function to enforce max depth of 2 (primary -> secondary only)
CREATE OR REPLACE FUNCTION check_node_depth()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a secondary node (has parent)
  IF NEW.parent_id IS NOT NULL THEN
    -- Check if parent is a primary node (has no parent)
    IF EXISTS (
      SELECT 1 FROM conversation_nodes 
      WHERE id = NEW.parent_id AND parent_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Maximum node depth is 2. Cannot create sub-node under another sub-node.';
    END IF;
    -- Mark as secondary
    NEW.node_type := 'secondary';
  ELSE
    -- Mark as primary
    NEW.node_type := 'primary';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger for depth enforcement
DROP TRIGGER IF EXISTS enforce_node_depth ON conversation_nodes;
CREATE TRIGGER enforce_node_depth
  BEFORE INSERT OR UPDATE ON conversation_nodes
  FOR EACH ROW
  EXECUTE FUNCTION check_node_depth();

-- 12. Create default primary nodes for existing groups
INSERT INTO conversation_nodes (group_id, title, description, icon, color, is_default, sort_order, created_by)
SELECT DISTINCT 
  g.id,
  'القرارات',
  'مساحة لمناقشة واتخاذ القرارات المهمة',
  'vote',
  '#F59E0B',
  true,
  1,
  g.created_by
FROM groups g
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_nodes cn 
  WHERE cn.group_id = g.id AND cn.title = 'القرارات'
);

INSERT INTO conversation_nodes (group_id, title, description, icon, color, is_default, sort_order, created_by)
SELECT DISTINCT 
  g.id,
  'النقاشات',
  'مساحة للنقاشات العامة والحوارات',
  'message-circle',
  '#3B82F6',
  true,
  2,
  g.created_by
FROM groups g
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_nodes cn 
  WHERE cn.group_id = g.id AND cn.title = 'النقاشات'
);

INSERT INTO conversation_nodes (group_id, title, description, icon, color, is_default, sort_order, created_by)
SELECT DISTINCT 
  g.id,
  'المشاريع',
  'مساحة لإدارة ومتابعة المشاريع',
  'briefcase',
  '#10B981',
  true,
  3,
  g.created_by
FROM groups g
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_nodes cn 
  WHERE cn.group_id = g.id AND cn.title = 'المشاريع'
);

INSERT INTO conversation_nodes (group_id, title, description, icon, color, is_default, sort_order, created_by)
SELECT DISTINCT 
  g.id,
  'الأسئلة',
  'مساحة للأسئلة والاستفسارات',
  'help-circle',
  '#8B5CF6',
  true,
  4,
  g.created_by
FROM groups g
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_nodes cn 
  WHERE cn.group_id = g.id AND cn.title = 'الأسئلة'
);

INSERT INTO conversation_nodes (group_id, title, description, icon, color, is_default, sort_order, created_by)
SELECT DISTINCT 
  g.id,
  'المتابعة',
  'مساحة لمتابعة المهام والتقدم',
  'check-circle',
  '#EC4899',
  true,
  5,
  g.created_by
FROM groups g
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_nodes cn 
  WHERE cn.group_id = g.id AND cn.title = 'المتابعة'
);
