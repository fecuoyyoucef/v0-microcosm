-- Approval requests table
CREATE TABLE IF NOT EXISTS public.agent_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_data JSONB NOT NULL,
  context_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID REFERENCES public.admins(id),
  approval_reason TEXT,
  severity TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.agent_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.ai_agents(id),
  action TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_approval_requests_status ON public.agent_approval_requests(status);
CREATE INDEX idx_approval_requests_created ON public.agent_approval_requests(created_at);
CREATE INDEX idx_audit_logs_agent ON public.agent_audit_logs(agent_id);
CREATE INDEX idx_audit_logs_timestamp ON public.agent_audit_logs(timestamp);

-- Enable RLS
ALTER TABLE public.agent_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only owner/admin can view
CREATE POLICY "Owner can view approvals" ON public.agent_approval_requests
  FOR SELECT USING (true);

CREATE POLICY "Owner can view audit logs" ON public.agent_audit_logs
  FOR SELECT USING (true);
