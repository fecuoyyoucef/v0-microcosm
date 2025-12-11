-- جدول الذاكرة المشتركة / اليوميات
CREATE TABLE IF NOT EXISTS collective_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary TEXT NOT NULL,
  highlights JSONB DEFAULT '[]',
  topics JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',
  message_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, summary_date)
);

-- جدول غرفة القرارات
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  ai_summary TEXT,
  status TEXT DEFAULT 'voting' CHECK (status IN ('voting', 'closed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  voting_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- جدول التصويتات
CREATE TABLE IF NOT EXISTS decision_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote TEXT NOT NULL CHECK (vote IN ('agree', 'disagree', 'neutral')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(decision_id, user_id)
);

-- Enable RLS
ALTER TABLE collective_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collective_memory
CREATE POLICY "Members can view group memory" ON collective_memory
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = collective_memory.group_id AND user_id = auth.uid())
  );

-- RLS Policies for decisions
CREATE POLICY "Members can view group decisions" ON decisions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = decisions.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can create decisions" ON decisions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = decisions.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can update decisions" ON decisions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = decisions.group_id AND user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for decision_votes
CREATE POLICY "Members can vote on decisions" ON decision_votes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM decisions d
      JOIN group_members gm ON gm.group_id = d.group_id
      WHERE d.id = decision_votes.decision_id AND gm.user_id = auth.uid()
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_collective_memory_group_date ON collective_memory(group_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_group ON decisions(group_id);
CREATE INDEX IF NOT EXISTS idx_decision_votes_decision ON decision_votes(decision_id);
