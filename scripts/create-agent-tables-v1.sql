-- نظام الوكلاء الذكية - جداول قاعدة البيانات
-- المرحلة 1: البنية التحتية

-- جدول قرارات الوكيل الرئيسي (Chief Agent Decisions)
CREATE TABLE IF NOT EXISTS agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL CHECK (agent_type IN ('chief', 'content_guardian', 'user_manager', 'system_monitor', 'github_agent')),
  context TEXT NOT NULL,
  user_message TEXT,
  decision TEXT NOT NULL,
  tool_calls JSONB DEFAULT '[]'::jsonb,
  reasoning TEXT,
  model_used TEXT DEFAULT 'moonshotai/Kimi-K2-Instruct-0905',
  tokens_used INTEGER,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- جدول طلبات الموافقة (Approval Requests)
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  requested_by TEXT NOT NULL,
  agent_decision_id UUID REFERENCES agent_decisions(id) ON DELETE CASCADE,
  details JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول تنفيذ الأدوات (Tool Executions)
CREATE TABLE IF NOT EXISTS tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID REFERENCES agent_decisions(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_category TEXT CHECK (tool_category IN ('github', 'database', 'filesystem', 'analysis', 'monitoring', 'communication')),
  args JSONB NOT NULL,
  result JSONB,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time_ms INTEGER,
  retries INTEGER DEFAULT 0
);

-- جدول محادثات الوكيل (Agent Conversations)
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  agent_type TEXT NOT NULL,
  conversation_history JSONB DEFAULT '[]'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- جدول أداء الوكيل (Agent Performance Metrics)
CREATE TABLE IF NOT EXISTS agent_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول إجراءات GitHub التلقائية (GitHub Automated Actions)
CREATE TABLE IF NOT EXISTS github_automated_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID REFERENCES agent_decisions(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('create_issue', 'comment', 'create_pr', 'merge_pr', 'update_file', 'security_scan')),
  github_url TEXT,
  github_id TEXT,
  repository TEXT,
  branch TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول تحليل الأخطاء (Error Analysis)
CREATE TABLE IF NOT EXISTS error_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  analysis TEXT,
  suggested_fix TEXT,
  related_files TEXT[],
  github_issue_id UUID REFERENCES github_automated_actions(id),
  analyzed_by TEXT DEFAULT 'chief_agent',
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent_type ON agent_decisions(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_executed_at ON agent_decisions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_success ON agent_decisions(success);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_risk_level ON approval_requests(risk_level);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON approval_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_executions_decision_id ON tool_executions(decision_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_tool_name ON tool_executions(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_executions_success ON tool_executions(success);
CREATE INDEX IF NOT EXISTS idx_tool_executions_executed_at ON tool_executions(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_is_active ON agent_conversations(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_last_message_at ON agent_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_type ON agent_metrics(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_metric_name ON agent_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_recorded_at ON agent_metrics(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_github_automated_actions_action_type ON github_automated_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_github_automated_actions_created_at ON github_automated_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_analysis_resolved ON error_analysis(resolved);
CREATE INDEX IF NOT EXISTS idx_error_analysis_analyzed_at ON error_analysis(analyzed_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_automated_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_analysis ENABLE ROW LEVEL SECURITY;

-- السماح لـ service_role بالوصول الكامل (للوكلاء)
CREATE POLICY "Service role can manage agent_decisions" ON agent_decisions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage approval_requests" ON approval_requests
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage tool_executions" ON tool_executions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage agent_conversations" ON agent_conversations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage agent_metrics" ON agent_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage github_automated_actions" ON github_automated_actions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage error_analysis" ON error_analysis
  FOR ALL USING (auth.role() = 'service_role');

-- المستخدمون المصادق عليهم يمكنهم قراءة بعض البيانات
CREATE POLICY "Authenticated users can read their conversations" ON agent_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can read approval requests" ON approval_requests
  FOR SELECT USING (auth.role() = 'authenticated');

-- دالة لتنظيف البيانات القديمة (أقدم من 90 يوم)
CREATE OR REPLACE FUNCTION cleanup_old_agent_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- حذف القرارات القديمة
  DELETE FROM agent_decisions 
  WHERE executed_at < NOW() - INTERVAL '90 days';
  
  -- حذف المحادثات غير النشطة القديمة
  DELETE FROM agent_conversations 
  WHERE is_active = FALSE AND last_message_at < NOW() - INTERVAL '30 days';
  
  -- حذف المقاييس القديمة
  DELETE FROM agent_metrics 
  WHERE recorded_at < NOW() - INTERVAL '90 days';
  
  -- حذف تحليل الأخطاء المحلولة القديمة
  DELETE FROM error_analysis 
  WHERE resolved = TRUE AND resolved_at < NOW() - INTERVAL '90 days';
END;
$$;

-- دالة لحساب إحصائيات الوكيل
CREATE OR REPLACE FUNCTION get_agent_stats(
  p_agent_type TEXT DEFAULT NULL,
  p_time_range INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE (
  agent_type TEXT,
  total_decisions BIGINT,
  successful_decisions BIGINT,
  failed_decisions BIGINT,
  success_rate NUMERIC,
  avg_execution_time_ms NUMERIC,
  total_tools_used BIGINT,
  pending_approvals BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ad.agent_type,
    COUNT(ad.id) as total_decisions,
    COUNT(ad.id) FILTER (WHERE ad.success = TRUE) as successful_decisions,
    COUNT(ad.id) FILTER (WHERE ad.success = FALSE) as failed_decisions,
    ROUND(
      (COUNT(ad.id) FILTER (WHERE ad.success = TRUE)::NUMERIC / NULLIF(COUNT(ad.id), 0) * 100), 
      2
    ) as success_rate,
    ROUND(AVG(ad.execution_time_ms), 2) as avg_execution_time_ms,
    COUNT(te.id) as total_tools_used,
    COUNT(ar.id) FILTER (WHERE ar.status = 'pending') as pending_approvals
  FROM agent_decisions ad
  LEFT JOIN tool_executions te ON te.decision_id = ad.id
  LEFT JOIN approval_requests ar ON ar.agent_decision_id = ad.id
  WHERE 
    ad.executed_at >= NOW() - p_time_range
    AND (p_agent_type IS NULL OR ad.agent_type = p_agent_type)
  GROUP BY ad.agent_type;
END;
$$;

-- إضافة تعليقات للجداول
COMMENT ON TABLE agent_decisions IS 'سجل قرارات الوكيل الذكي وتفاصيل التنفيذ';
COMMENT ON TABLE approval_requests IS 'طلبات الموافقة للإجراءات عالية المخاطر';
COMMENT ON TABLE tool_executions IS 'سجل تنفيذ الأدوات التي استخدمها الوكيل';
COMMENT ON TABLE agent_conversations IS 'محادثات المستخدمين مع الوكلاء';
COMMENT ON TABLE agent_metrics IS 'مقاييس أداء الوكلاء';
COMMENT ON TABLE github_automated_actions IS 'الإجراءات التلقائية على GitHub';
COMMENT ON TABLE error_analysis IS 'تحليل الأخطاء والحلول المقترحة';
