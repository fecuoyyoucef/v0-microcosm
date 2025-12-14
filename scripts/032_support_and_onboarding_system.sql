-- نظام الدعم والتوجيه الشامل

-- جدول تقارير المشاكل من المستخدمين
CREATE TABLE IF NOT EXISTS user_issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL, -- bug, feature_request, confusion, other
  severity TEXT DEFAULT 'medium', -- low, medium, high, critical
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  screenshot_url TEXT,
  status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
  admin_notes TEXT,
  resolved_by UUID REFERENCES admins(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول تقدم Onboarding للمستخدمين
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  current_step TEXT DEFAULT 'welcome',
  skipped BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول أحداث المراقبة
CREATE TABLE IF NOT EXISTS monitoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- page_view, feature_used, error, performance
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  event_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول محادثات وكيل الدعم
CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  issue_detected TEXT,
  auto_resolved BOOLEAN DEFAULT false,
  escalated_to_admin BOOLEAN DEFAULT false,
  admin_reviewed BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول تجميع الأنماط المتكررة
CREATE TABLE IF NOT EXISTS recurring_issue_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL,
  pattern_description TEXT NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  affected_users INTEGER DEFAULT 1,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  priority TEXT DEFAULT 'medium',
  admin_status TEXT DEFAULT 'pending', -- pending, acknowledged, fixing, resolved
  related_issues UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE user_issue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_issue_patterns ENABLE ROW LEVEL SECURITY;

-- المستخدمون يمكنهم إنشاء ومشاهدة تقاريرهم الخاصة
CREATE POLICY "Users can manage own reports" ON user_issue_reports
  FOR ALL USING (auth.uid() = user_id);

-- المستخدمون يمكنهم إدارة تقدمهم في Onboarding
CREATE POLICY "Users can manage own onboarding" ON user_onboarding_progress
  FOR ALL USING (auth.uid() = user_id);

-- النظام يمكنه تسجيل أحداث المراقبة
CREATE POLICY "System can log monitoring events" ON monitoring_events
  FOR INSERT WITH CHECK (true);

-- المستخدمون يمكنهم مشاهدة أحداثهم الخاصة
CREATE POLICY "Users can view own events" ON monitoring_events
  FOR SELECT USING (auth.uid() = user_id);

-- المستخدمون يمكنهم إدارة محادثات الدعم الخاصة بهم
CREATE POLICY "Users can manage own support chats" ON support_conversations
  FOR ALL USING (auth.uid() = user_id);

-- الإدارة فقط تشاهد الأنماط المتكررة
CREATE POLICY "Service role can manage patterns" ON recurring_issue_patterns
  FOR ALL USING (true);

-- Indexes للأداء
CREATE INDEX idx_user_issues_status ON user_issue_reports(status, created_at DESC);
CREATE INDEX idx_user_issues_severity ON user_issue_reports(severity, created_at DESC);
CREATE INDEX idx_monitoring_events_type ON monitoring_events(event_type, created_at DESC);
CREATE INDEX idx_monitoring_events_user ON monitoring_events(user_id, created_at DESC);
CREATE INDEX idx_support_conversations_user ON support_conversations(user_id, updated_at DESC);
CREATE INDEX idx_recurring_patterns_priority ON recurring_issue_patterns(priority, admin_status);
