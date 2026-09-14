-- Automatic topic organization: temporary AI suggestions with auditable evidence.
ALTER TABLE conversation_nodes
  ADD COLUMN IF NOT EXISTS auto_status TEXT NOT NULL DEFAULT 'manual' CHECK (auto_status IN ('manual', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS auto_topic_key TEXT,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS source_message_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS temporary_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_updated_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS conversation_nodes_group_auto_topic_key
  ON conversation_nodes(group_id, auto_topic_key)
  WHERE auto_topic_key IS NOT NULL AND auto_status <> 'rejected';

ALTER TABLE messages
  ADD CONSTRAINT messages_node_id_fkey
  FOREIGN KEY (node_id) REFERENCES conversation_nodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_group_created_node
  ON messages(group_id, created_at DESC, node_id);

CREATE TABLE IF NOT EXISTS auto_node_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  processed_message_count INTEGER NOT NULL DEFAULT 0,
  created_node_count INTEGER NOT NULL DEFAULT 0,
  linked_message_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'skipped', 'error')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE auto_node_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read auto node runs" ON auto_node_runs FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = auto_node_runs.group_id AND group_members.user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_auto_node_runs_group_created ON auto_node_runs(group_id, created_at DESC);

INSERT INTO feature_flags (feature_key, feature_name_ar, feature_name_en, description_ar, category, is_enabled, version)
VALUES ('ai_auto_topic_nodes', 'تنظيم المواضيع تلقائياً', 'AI Auto Topic Nodes', 'اقتراح عقد مؤقتة وربط الرسائل المهمة بها بعد مراجعة المسؤول', 'ai', true, '1.0.0')
ON CONFLICT (feature_key) DO NOTHING;

ALTER TABLE groups ADD COLUMN IF NOT EXISTS auto_topic_nodes_enabled BOOLEAN NOT NULL DEFAULT true;
UPDATE groups SET auto_topic_nodes_enabled = true WHERE auto_topic_nodes_enabled IS NULL;
