/**
 * Public agent API.
 *
 * Import from here in API routes and server actions. Internal modules
 * keep importing from their direct paths to avoid cycles.
 */

export { askChief } from "./agents/chief"
export { moderate } from "./agents/moderator"
export { support } from "./agents/support"
export { analyze } from "./agents/analyst"
export { diagnose } from "./agents/developer"

export { runAgent } from "./runtime"
export { AGENTS, getAgent, toolsForAgent, isAgentEnabled, listAgents } from "./registry"
export { getPolicy, canAutoExecute, getRisk } from "./policy"
export { executeTool } from "./tools/executor"
export {
  enqueueApproval,
  listPending as listPendingApprovals,
  decide as decideApproval,
  executeApproved,
} from "./approvals"
export { requireAdmin } from "./auth"

export type {
  AgentInput,
  AgentKind,
  AgentRun,
  ChatMessage,
  GroqModel,
  RiskLevel,
  RunOptions,
  ToolCall,
  ToolDefinition,
  ToolResult,
} from "./types"
