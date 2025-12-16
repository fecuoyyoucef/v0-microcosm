-- الخطوة 1: بناء جداول نظام الوكلاء الذكية
-- هذا النظام يدعم: وكيل رئيسي، وكلاء فرعيين، تسجيل الإجراءات، نظام التراجع، والتعلم

-- 1. جدول الوكلاء (Agents)
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('chief', 'content_guardian', 'user_manager', 'system_monitor', 'analytics', 'community_manager')),
  description TEXT,
  capabilities JSONB DEFAULT '[]'::jsonb,
  permissions JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  confidence_threshold NUMERIC DEFAULT 0.70,
  parent_agent_id UUID REFERENCES ai_agents(id),
  model_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول الإجراءات (Actions Log)
CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  reasoning TEXT NOT NULL,
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  snapshot_before JSONB,
  snapshot_after JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'undone', 'overridden', 'failed')),
  undo_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES profiles(id)
);

-- 3. جدول قرارات المالك (Owner Decisions)
CREATE TABLE IF NOT EXISTS owner_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES agent_actions(id),
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'undo', 'override')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول ذاكرة التعلم (Learning Memory)
CREATE TABLE IF NOT EXISTS agent_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id),
  scenario_type TEXT NOT NULL,
  context_data JSONB NOT NULL,
  action_taken TEXT NOT NULL,
  owner_feedback TEXT CHECK (owner_feedback IN ('approved', 'undone', 'overridden')),
  learning_points JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول حالة الوكلاء (Agent Status)
CREATE TABLE IF NOT EXISTS agent_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id),
  is_active BOOLEAN DEFAULT true,
  last_action_at TIMESTAMPTZ,
  actions_today INTEGER DEFAULT 0,
  actions_this_week INTEGER DEFAULT 0,
  accuracy_rate NUMERIC,
  total_undos INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. جدول تقارير الأخطاء (Error Reports to v0)
CREATE TABLE IF NOT EXISTS v0_error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context_data JSONB,
  attempted_fixes JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'fixed', 'wont_fix')),
  v0_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 7. جدول الإجراءات المجدولة (Scheduled Actions)
CREATE TABLE IF NOT EXISTS agent_scheduled_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id),
  action_type TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'hourly', 'daily', 'weekly')),
  schedule_config JSONB NOT NULL,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_agent_actions_agent_id ON agent_actions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_status ON agent_actions(status);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created_at ON agent_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_learning_agent_id ON agent_learning(agent_id);
CREATE INDEX IF NOT EXISTS idx_v0_error_reports_status ON v0_error_reports(status);
CREATE INDEX IF NOT EXISTS idx_agent_scheduled_actions_next_run ON agent_scheduled_actions(next_run_at) WHERE is_active = true;

-- RLS Policies

-- ai_agents: فقط المالك والوكيل الرئيسي يمكنهم القراءة
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view agents"
  ON ai_agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.role = 'owner'
    )
  );

CREATE POLICY "Chief agent can view all agents"
  ON ai_agents FOR SELECT
  USING (true); -- يتم التحكم من السيرفر

-- agent_actions: المالك يمكنه القراءة والتراجع
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view all actions"
  ON agent_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.role = 'owner'
    )
  );

CREATE POLICY "Owner can undo actions"
  ON agent_actions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.role = 'owner'
    )
  );

-- owner_decisions: المالك فقط
ALTER TABLE owner_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage decisions"
  ON owner_decisions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.role = 'owner'
    )
  );

-- agent_learning: الوكلاء والمالك
ALTER TABLE agent_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents and owner can manage learning"
  ON agent_learning FOR ALL
  USING (true); -- يتم التحكم من السيرفر

-- agent_status: المالك فقط
ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view agent status"
  ON agent_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.role = 'owner'
    )
  );

-- v0_error_reports: المالك فقط
ALTER TABLE v0_error_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view error reports"
  ON v0_error_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.role = 'owner'
    )
  );

-- agent_scheduled_actions: المالك فقط
ALTER TABLE agent_scheduled_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage scheduled actions"
  ON agent_scheduled_actions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid() 
      AND admins.role = 'owner'
    )
  );

-- إدخال الوكيل الرئيسي والوكلاء الفرعيين
INSERT INTO ai_agents (agent_name, agent_type, description, capabilities, permissions, confidence_threshold, model_config)
VALUES 
  (
    'Chief AI Agent',
    'chief',
    'الوكيل الرئيسي - نائب المالك بصلاحيات كاملة',
    '["decision_making", "agent_management", "system_oversight", "v0_integration", "learning", "automation"]'::jsonb,
    '{
      "can_delete_users": true,
      "can_delete_groups": true,
      "can_ban_users": true,
      "can_modify_content": true,
      "can_access_all_data": true,
      "can_execute_code": true,
      "can_contact_v0": true
    }'::jsonb,
    0.85,
    '{
      "model": "grok-beta",
      "temperature": 0.3,
      "max_tokens": 2000
    }'::jsonb
  ),
  (
    'Content Guardian',
    'content_guardian',
    'حماية المحتوى والإشراف التلقائي',
    '["content_moderation", "spam_detection", "image_analysis", "language_detection"]'::jsonb,
    '{
      "can_delete_messages": true,
      "can_hide_content": true,
      "can_warn_users": true,
      "can_temp_ban": true
    }'::jsonb,
    0.90,
    '{
      "model": "grok-beta",
      "temperature": 0.2,
      "max_tokens": 1000
    }'::jsonb
  ),
  (
    'User Manager',
    'user_manager',
    'إدارة المستخدمين والكشف عن الحسابات المشبوهة',
    '["user_behavior_analysis", "bot_detection", "spam_detection", "user_scoring"]'::jsonb,
    '{
      "can_warn_users": true,
      "can_temp_ban": true,
      "can_ban_users": true,
      "can_delete_users": true
    }'::jsonb,
    0.85,
    '{
      "model": "grok-beta",
      "temperature": 0.3,
      "max_tokens": 1000
    }'::jsonb
  ),
  (
    'System Monitor',
    'system_monitor',
    'مراقبة النظام واكتشاف الأخطاء',
    '["error_detection", "performance_monitoring", "auto_fixing", "v0_reporting"]'::jsonb,
    '{
      "can_access_logs": true,
      "can_fix_data": true,
      "can_contact_v0": true,
      "can_restart_services": false
    }'::jsonb,
    0.75,
    '{
      "model": "grok-beta",
      "temperature": 0.2,
      "max_tokens": 1500
    }'::jsonb
  ),
  (
    'Analytics Bot',
    'analytics',
    'التحليلات والتقارير التلقائية',
    '["data_analysis", "trend_detection", "report_generation", "predictions"]'::jsonb,
    '{
      "can_access_all_data": true,
      "can_generate_reports": true
    }'::jsonb,
    0.70,
    '{
      "model": "grok-beta",
      "temperature": 0.4,
      "max_tokens": 2000
    }'::jsonb
  ),
  (
    'Community Manager',
    'community_manager',
    'إدارة المجتمع والتفاعل مع الأعضاء',
    '["user_engagement", "welcome_messages", "community_support", "suggestion_system"]'::jsonb,
    '{
      "can_send_messages": true,
      "can_create_notifications": true
    }'::jsonb,
    0.80,
    '{
      "model": "grok-beta",
      "temperature": 0.7,
      "max_tokens": 1000
    }'::jsonb
  );

-- إنشاء agent_status لكل وكيل
INSERT INTO agent_status (agent_id, is_active, accuracy_rate)
SELECT id, true, 1.0 FROM ai_agents;

COMMENT ON TABLE ai_agents IS 'جدول الوكلاء الذكية - يحتوي على الوكيل الرئيسي والوكلاء الفرعيين';
COMMENT ON TABLE agent_actions IS 'سجل كامل لكل إجراء قام به أي وكيل مع إمكانية التراجع';
COMMENT ON TABLE owner_decisions IS 'قرارات المالك (موافقة، تراجع، تجاوز) على إجراءات الوكلاء';
COMMENT ON TABLE agent_learning IS 'ذاكرة التعلم - يتعلم الوكيل من قرارات المالك';
COMMENT ON TABLE agent_status IS 'حالة كل وكيل ومعدل دقته';
COMMENT ON TABLE v0_error_reports IS 'تقارير الأخطاء المرسلة لـ v0 للإصلاح';
COMMENT ON TABLE agent_scheduled_actions IS 'المهام المجدولة للوكلاء (تقارير يومية، تنظيف، إلخ)';
