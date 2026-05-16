/**
 * Shared types for the agent system.
 *
 * We model the chat protocol close to Groq's native API (OpenAI-compatible
 * tool calling) instead of inventing our own format. This keeps the runtime
 * loop a thin wrapper around the SDK and makes upgrades painless.
 */

export type AgentKind = "chief" | "moderator" | "support" | "analyst" | "developer"
/** Alias used by API routes — same set, friendlier name. */
export type AgentId = AgentKind

/** Approval request shape (matches `approval_requests` table). */
export interface ApprovalRequest {
  id: string
  action: string
  description: string
  risk_level: RiskLevel
  requested_by: string
  details: Record<string, unknown>
  status: "pending" | "approved" | "rejected"
  approved_by?: string | null
  approved_at?: string | null
  executed_at?: string | null
  execution_result?: unknown
  created_at: string
}

export type RiskLevel = "low" | "medium" | "high" | "critical"

export type GroqModel =
  | "llama-3.3-70b-versatile"
  | "llama-3.1-8b-instant"
  | "mixtral-8x7b-32768"
  | "gemma2-9b-it"

/** A single tool definition advertised to the model. Matches Groq's schema. */
export interface ToolDefinition {
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, unknown>
      required?: string[]
      additionalProperties?: boolean
    }
  }
}

/** A tool call emitted by the model. */
export interface ToolCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string // JSON-encoded by the model
  }
}

/** Chat messages exchanged with the model. */
export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; name: string; content: string }

/** Result of executing a tool. Stored as JSON in tool_executions. */
export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  requires_approval?: boolean
  /** Risk level for governance — set by the executor, not the model. */
  risk?: RiskLevel
}

/** A complete agent run for logging/observability. */
export interface AgentRun {
  id: string
  agent: AgentKind
  model: GroqModel
  user_id?: string | null
  input: string
  output: string | null
  tool_calls: Array<{ name: string; args: unknown; result: ToolResult }>
  iterations: number
  tokens_in: number
  tokens_out: number
  duration_ms: number
  success: boolean
  error?: string
}

/** Configuration for a single run of the agent loop. */
export interface RunOptions {
  agent: AgentKind
  model?: GroqModel
  system: string
  messages: ChatMessage[]
  tools?: ToolDefinition[]
  /** Hard cap on tool-call iterations. Default: 6. */
  maxIterations?: number
  /** Override sampling. */
  temperature?: number
  /** Force JSON output (no tool calls). Mutually exclusive with tools. */
  jsonMode?: boolean
  /** Forward identifying info for audit logs. */
  userId?: string | null
  /** Free-form context stored on the agent_decisions row. */
  context?: string
}
