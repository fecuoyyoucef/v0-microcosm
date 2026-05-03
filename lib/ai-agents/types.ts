// نظام الوكلاء - تعريفات الأنواع

// ============================
// Tool Definitions
// ============================

export interface ToolParameter {
  type: string
  description: string
  enum?: string[]
  items?: ToolParameter
  properties?: Record<string, ToolParameter>
  required?: string[]
}

export interface Tool {
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, ToolParameter>
      required: string[]
    }
  }
}

export interface ToolCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string | Record<string, any>
  }
  // Shorthand fields used internally by kimi-client
  name?: string
  arguments?: Record<string, any>
  args?: Record<string, any>
}

export interface ToolResult {
  success: boolean
  data?: any
  error?: string
  requires_approval?: boolean
  execution_time_ms?: number
}

// Alias for backwards compatibility
export type ToolExecutionResult = ToolResult

// Agent context for decision making
export interface AgentContext {
  message_id?: string
  user_id?: string
  group_id?: string
  content?: string
  event_type?: string
  environment?: string
  permanent?: boolean
  table?: string
  [key: string]: any
}

// Agent decision output
export interface AgentDecision {
  action: string
  target_id: string
  reasoning: string
  confidence: number
  severity: "low" | "medium" | "high" | "critical"
  auto_execute: boolean
  tool_calls_used?: string[]
}

// ============================
// Agent Message Types
// ============================

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool" | "function"
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

export interface AgentResponse {
  response: string
  toolCalls: ToolCall[]
  tool_calls?: ToolCall[]
  reasoning?: string
  finish_reason?: "stop" | "tool_calls" | "length" | "error"
  conversationId?: string
  executionTime?: number
}

// Context passed to agents during a conversation
export interface ConversationContext {
  github?: {
    owner: string
    repo: string
    token?: string
    webhookSecret?: string
  }
  database?: {
    connection: string
  }
  user?: {
    id: string
    role: string
  }
  metadata?: Record<string, any>
}

// ============================
// Agent Decision Types
// ============================

export interface AgentDecision {
  id?: string
  agent_type: "chief" | "content" | "user_manager" | "system_monitor" | "github"
  context: string
  decision: string
  tool_calls?: ToolCall[]
  reasoning?: string
  executed_at?: Date
  success?: boolean
  error_message?: string
  execution_time_ms?: number
}

// ============================
// Approval System Types
// ============================

export type RiskLevel = "low" | "medium" | "high" | "critical"
export type ApprovalStatus = "pending" | "approved" | "rejected" | "auto_approved"

export interface ApprovalRequest {
  id?: string
  action: string
  description: string
  risk_level: RiskLevel
  requested_by: string
  details: Record<string, any>
  status: ApprovalStatus
  approved_by?: string
  approved_at?: Date
  created_at?: Date
}

// ============================
// GitHub Types
// ============================

export interface GitHubFile {
  path: string
  content: string
  sha: string
  size?: number
  url?: string
}

export interface GitHubIssue {
  number: number
  title: string
  body: string
  state: "open" | "closed"
  labels: string[]
  url: string
  created_at: Date
  updated_at: Date
}

export interface GitHubPullRequest {
  number: number
  title: string
  body: string
  state: "open" | "closed" | "merged"
  head: string
  base: string
  url: string
  mergeable?: boolean
}

export interface GitHubCommit {
  sha: string
  message: string
  author: string
  date: Date
  url: string
}

export interface GitHubAutomatedAction {
  id?: string
  action_type: "create_issue" | "create_pr" | "update_file" | "comment" | "merge_pr"
  target_type: "issue" | "pr" | "file" | "commit"
  target_id: string
  description: string
  github_url?: string
  status: "pending" | "completed" | "failed"
  error_message?: string
  agent_decision_id?: string
  created_at?: Date
  completed_at?: Date
}

// ============================
// Error Analysis Types
// ============================

export interface ErrorAnalysis {
  id?: string
  error_message: string
  error_stack?: string
  error_type: string
  context: Record<string, any>
  analysis: string
  severity: "low" | "medium" | "high" | "critical"
  suggested_fix?: string
  related_files?: string[]
  github_issue_id?: number
  status: "new" | "analyzing" | "resolved" | "ignored"
  resolved_at?: Date
  created_at?: Date
}

// ============================
// Agent Metrics Types
// ============================

export interface AgentMetrics {
  id?: string
  agent_type: string
  metric_type: "decision" | "tool_execution" | "error" | "performance"
  metric_name: string
  metric_value: number
  metadata?: Record<string, any>
  recorded_at?: Date
}

export interface AgentStats {
  total_decisions: number
  success_rate: number
  avg_execution_time_ms: number
  most_used_tools: Array<{ tool_name: string; count: number }>
  error_count: number
  approval_required_count: number
}

// ============================
// Conversation Types
// ============================

export interface AgentConversation {
  id?: string
  session_id: string
  agent_type: string
  messages: AgentMessage[]
  context?: Record<string, any>
  created_at?: Date
  updated_at?: Date
}

// ============================
// Client Configuration
// ============================

export interface KimiClientConfig {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  tools?: Tool[]
  stream?: boolean
}

export interface HuggingFaceConfig {
  apiKey: string
  model: string
  baseUrl?: string
}
