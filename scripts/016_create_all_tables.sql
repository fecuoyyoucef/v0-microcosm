-- إنشاء جميع الجداول المطلوبة للذاكرة المشتركة وغرفة القرارات

-- جدول الذاكرة المشتركة
CREATE TABLE IF NOT EXISTS collective_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  summary_date DATE NOT NULL,
  summary TEXT NOT NULL,
  highlights JSONB DEFAULT '[]',
  topics JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',
  mood TEXT DEFAULT 'neutral',
  message_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, summary_date)
);

-- جدول القرارات
CREATE TABLE IF NOT EXISTS decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'voting' CHECK (status IN ('voting', 'closed', 'cancelled')),
  voting_ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول التصويتات
CREATE TABLE IF NOT EXISTS decision_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('agree', 'disagree', 'neutral')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(decision_id, user_id)
);

-- تفعيل RLS
ALTER TABLE collective_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_votes ENABLE ROW LEVEL SECURITY;

-- سياسات الذاكرة المشتركة
DROP POLICY IF EXISTS "Group members can view collective memory" ON collective_memory;
CREATE POLICY "Group members can view collective memory" ON collective_memory
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = collective_memory.group_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Group members can insert collective memory" ON collective_memory;
CREATE POLICY "Group members can insert collective memory" ON collective_memory
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = collective_memory.group_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Group members can update collective memory" ON collective_memory;
CREATE POLICY "Group members can update collective memory" ON collective_memory
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = collective_memory.group_id AND user_id = auth.uid())
  );

-- سياسات القرارات
DROP POLICY IF EXISTS "Group members can view decisions" ON decisions;
CREATE POLICY "Group members can view decisions" ON decisions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = decisions.group_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Group members can create decisions" ON decisions;
CREATE POLICY "Group members can create decisions" ON decisions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = decisions.group_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update decisions" ON decisions;
CREATE POLICY "Admins can update decisions" ON decisions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = decisions.group_id AND user_id = auth.uid() AND role = 'admin')
  );

-- سياسات التصويتات
DROP POLICY IF EXISTS "Group members can view votes" ON decision_votes;
CREATE POLICY "Group members can view votes" ON decision_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM decisions d
      JOIN group_members gm ON d.group_id = gm.group_id
      WHERE d.id = decision_votes.decision_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can vote" ON decision_votes;
CREATE POLICY "Users can vote" ON decision_votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM decisions d
      JOIN group_members gm ON d.group_id = gm.group_id
      WHERE d.id = decision_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their vote" ON decision_votes;
CREATE POLICY "Users can update their vote" ON decision_votes
  FOR UPDATE USING (user_id = auth.uid());

-- تفعيل Realtime على الجداول
ALTER PUBLICATION supabase_realtime ADD TABLE collective_memory;
ALTER PUBLICATION supabase_realtime ADD TABLE decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE decision_votes;

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_collective_memory_group_date ON collective_memory(group_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_group ON decisions(group_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decision_votes_decision ON decision_votes(decision_id);
