/**
 * Tool Executor
 * 
 * Central dispatcher for executing AI agent tool calls
 */

import { getGitHubTools } from "./tools/github-tools"
import { getSupabaseTools } from "./tools/supabase-tools"
import { CHIEF_AGENT_CONFIG } from "./config"
import type { ToolResult, ToolCall } from "./types"
import { createServiceClient } from "@/lib/supabase/server"

/**
 * Execute a single tool call
 * Accepts either a ToolCall object OR (name, args) directly for internal use
 */
export async function executeToolCall(
  toolCallOrName: ToolCall | string,
  argsOverride?: Record<string, any>
): Promise<ToolResult> {
  let name: string
  let args: Record<string, any>

  if (typeof toolCallOrName === "string") {
    // Called as executeToolCall(name, args)
    name = toolCallOrName
    args = argsOverride || {}
  } else {
    // Called as executeToolCall(toolCall)
    // Support both {name, arguments} and {function: {name, arguments}} formats
    if (toolCallOrName.name) {
      name = toolCallOrName.name
      args = toolCallOrName.arguments || toolCallOrName.args || {}
    } else {
      name = toolCallOrName.function?.name || ""
      const rawArgs = toolCallOrName.function?.arguments
      args = typeof rawArgs === "string" ? JSON.parse(rawArgs || "{}") : (rawArgs || {})
    }
  }

  console.log("[v0] Executing tool:", name, "with args:", args)

  try {
    // Check if auto-execution is allowed
    if (!canAutoExecute(name)) {
      return {
        success: false,
        error: `Tool "${name}" requires manual approval`,
        requires_approval: true,
      }
    }

    // Route to appropriate tool handler
    const result = await routeToolCall(name, args)

    // Log execution to database
    await logToolExecution({ name, args, id: crypto.randomUUID() }, result)

    console.log("[v0] Tool execution result:", result)

    return result
  } catch (error: any) {
    console.error("[v0] Tool execution error:", error)
    return {
      success: false,
      error: `Tool execution failed: ${error.message}`,
    }
  }
}
    }

    // Route to appropriate tool handler
    const result = await routeToolCall(name, args)

    // Log execution to database
    await logToolExecution(toolCall, result)

    console.log("[v0] Tool execution result:", result)

    return result
  } catch (error: any) {
    console.error("[v0] Tool execution error:", error)
    return {
      success: false,
      error: `Tool execution failed: ${error.message}`,
    }
  }
}

/**
 * Execute multiple tool calls in sequence
 */
export async function executeToolCalls(
  toolCalls: ToolCall[]
): Promise<ToolResult[]> {
  const results: ToolResult[] = []

  for (const toolCall of toolCalls) {
    const result = await executeToolCall(toolCall)
    results.push(result)

    // Stop if a critical tool fails
    const toolName = toolCall.name || toolCall.function?.name || ""
    if (!result.success && isCriticalTool(toolName)) {
      break
    }
  }

  return results
}

/**
 * Route tool call to appropriate handler
 */
async function routeToolCall(
  name: string,
  args: Record<string, any>
): Promise<ToolResult> {
  // GitHub Tools
  if (name.startsWith("github_")) {
    return await executeGitHubTool(name, args)
  }

  // Database Tools - support both "database_query" and "query_database" naming
  if (name.startsWith("database_")) {
    return await executeDatabaseTool(name, args)
  }

  // Alias: query_database → database_query (Kimi may use either form)
  if (name === "query_database") {
    return await executeDatabaseTool("database_query", { table: args.table, select: args.select || "*", filters: args.filters, limit: args.limit || 100, order_by: args.order_by })
  }
  if (name === "update_record") {
    return await executeDatabaseTool("database_update", args)
  }
  if (name === "delete_record") {
    return await executeDatabaseTool("database_delete", args)
  }
  if (name === "execute_rpc") {
    return await executeDatabaseTool("database_rpc", args)
  }

  // Analysis Tools
  if (name.startsWith("analyze_") || name.startsWith("find_") || name.startsWith("suggest_")) {
    return await executeAnalysisTool(name, args)
  }

  // Monitoring Tools
  if (name.startsWith("get_") || name.startsWith("check_")) {
    return await executeMonitoringTool(name, args)
  }

  // Moderation Tools
  if (name.startsWith("moderate_") || name === "delete_message" || name === "warn_user") {
    return await executeModerationTool(name, args)
  }

  // Notification Tools
  if (name.startsWith("notify_") || name.startsWith("create_system")) {
    return await executeNotificationTool(name, args)
  }

  return {
    success: false,
    error: `Unknown tool: ${name}`,
  }
}

/**
 * Execute GitHub tool
 */
async function executeGitHubTool(
  name: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const github = getGitHubTools()

  switch (name) {
    case "github_read_file":
      return await github.readFile(args.path, args.ref)

    case "github_search_code":
      return await github.searchCode(args.query, args.extension)

    case "github_list_files":
      return await github.listFiles(args.path)

    case "github_create_issue":
      return await github.createIssue({
        title: args.title,
        body: args.body,
        labels: args.labels,
        assignees: args.assignees,
      })

    case "github_comment_on_issue":
      return await github.commentOnIssue(args.issue_number, args.comment)

    case "github_close_issue":
      return await github.closeIssue(args.issue_number, args.comment)

    case "github_create_pull_request":
      return await github.createPullRequest({
        title: args.title,
        body: args.body,
        head: args.head,
        base: args.base,
      })

    case "github_get_commit_history":
      return await github.getCommitHistory(args.path, args.limit)

    case "github_get_security_alerts":
      return await github.getSecurityAlerts()

    case "find_similar_issues":
      return await github.searchIssues(args.query, args.state)

    default:
      return {
        success: false,
        error: `Unknown GitHub tool: ${name}`,
      }
  }
}

/**
 * Execute database tool
 */
async function executeDatabaseTool(
  name: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const db = getSupabaseTools()

  switch (name) {
    case "database_query":
      return await db.query({
        table: args.table,
        select: args.select,
        filters: args.filters,
        limit: args.limit,
        order_by: args.order_by,
      })

    case "database_insert":
      return await db.insert({
        table: args.table,
        data: args.data,
      })

    case "database_update":
      return await db.update({
        table: args.table,
        filters: args.filters,
        data: args.data,
      })

    case "database_delete":
      return await db.delete({
        table: args.table,
        filters: args.filters,
      })

    case "database_rpc":
      return await db.rpc({
        function_name: args.function_name,
        params: args.params,
      })

    default:
      return {
        success: false,
        error: `Unknown database tool: ${name}`,
      }
  }
}

/**
 * Execute analysis tool
 */
async function executeAnalysisTool(
  name: string,
  args: Record<string, any>
): Promise<ToolResult> {
  // TODO: Implement analysis tools
  // These will analyze errors, suggest fixes, etc.
  
  switch (name) {
    case "analyze_error":
      return {
        success: true,
        data: {
          analysis: "Error analysis not yet implemented",
          suggestions: [],
        },
      }

    case "suggest_fix":
      return {
        success: true,
        data: {
          suggestion: "Fix suggestion not yet implemented",
          confidence: 0,
        },
      }

    default:
      return {
        success: false,
        error: `Analysis tool "${name}" not yet implemented`,
      }
  }
}

/**
 * Execute monitoring tool
 */
async function executeMonitoringTool(
  name: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const supabase = createServiceClient()

  switch (name) {
    case "get_system_health": {
      const timeRange = args.time_range || "24h"
      
      // Get error count
      const { count: errorCount } = await supabase
        .from("error_analysis")
        .select("*", { count: "exact", head: true })
        .gte("created_at", getTimeRangeStart(timeRange))

      // Get agent decisions count
      const { count: decisionsCount } = await supabase
        .from("agent_decisions")
        .select("*", { count: "exact", head: true })
        .gte("executed_at", getTimeRangeStart(timeRange))

      return {
        success: true,
        data: {
          time_range: timeRange,
          error_count: errorCount || 0,
          decisions_count: decisionsCount || 0,
          status: errorCount && errorCount > 100 ? "warning" : "healthy",
        },
      }
    }

    case "get_error_logs": {
      const { data, error } = await supabase
        .from("error_analysis")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(args.limit || 50)

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        data: {
          count: data?.length || 0,
          logs: data,
        },
      }
    }

    case "check_performance":
      return {
        success: true,
        data: {
          message: "Performance check not yet implemented",
        },
      }

    default:
      return {
        success: false,
        error: `Monitoring tool "${name}" not yet implemented`,
      }
  }
}

/**
 * Execute moderation tool
 */
async function executeModerationTool(
  name: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const supabase = await createClient()

  switch (name) {
    case "moderate_message": {
      // Basic content moderation logic
      const content = args.content.toLowerCase()
      const violations = []

      // Simple keyword check (should be replaced with AI moderation)
      const inappropriateWords = ["spam", "scam", "hate"]
      for (const word of inappropriateWords) {
        if (content.includes(word)) {
          violations.push(`Contains inappropriate word: ${word}`)
        }
      }

      return {
        success: true,
        data: {
          message_id: args.message_id,
          is_appropriate: violations.length === 0,
          violations,
          recommendation: violations.length > 0 ? "delete" : "approve",
        },
      }
    }

    case "delete_message": {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", args.message_id)

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        data: {
          message_id: args.message_id,
          deleted: true,
          reason: args.reason,
        },
      }
    }

    case "warn_user": {
      // Insert warning into database
      const { error } = await supabase.from("user_warnings").insert({
        user_id: args.user_id,
        reason: args.reason,
        severity: args.severity || "medium",
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        data: {
          user_id: args.user_id,
          warned: true,
        },
      }
    }

    default:
      return {
        success: false,
        error: `Moderation tool "${name}" not yet implemented`,
      }
  }
}

/**
 * Execute notification tool
 */
async function executeNotificationTool(
  name: string,
  args: Record<string, any>
): Promise<ToolResult> {
  // TODO: Implement notification system
  
  switch (name) {
    case "notify_admin":
      console.log("[v0] Admin notification:", args.title, args.message)
      return {
        success: true,
        data: {
          notified: true,
          title: args.title,
        },
      }

    case "create_system_alert":
      console.log("[v0] System alert:", args.alert_type, args.description)
      return {
        success: true,
        data: {
          alert_created: true,
          type: args.alert_type,
        },
      }

    default:
      return {
        success: false,
        error: `Notification tool "${name}" not yet implemented`,
      }
  }
}

/**
 * Check if a tool can be auto-executed
 */
function canAutoExecute(toolName: string): boolean {
  const autoExecuteConfig = CHIEF_AGENT_CONFIG.autoExecute

  // Map tool names to config keys
  const toolToConfigMap: Record<string, keyof typeof autoExecuteConfig> = {
    delete_message: "delete_message",
    warn_user: "warn_user",
    github_create_issue: "create_github_issue",
    github_comment_on_issue: "comment_on_issue",
  }

  const configKey = toolToConfigMap[toolName]
  if (configKey) {
    return autoExecuteConfig[configKey]
  }

  // Default: allow read-only operations
  const readOnlyTools = [
    "github_read_file",
    "github_search_code",
    "github_list_files",
    "github_get_commit_history",
    "github_get_security_alerts",
    "database_query",
    "get_system_health",
    "get_error_logs",
    "check_performance",
    "moderate_message",
    "find_similar_issues",
    "analyze_error",
    "suggest_fix",
  ]

  return readOnlyTools.includes(toolName)
}

/**
 * Check if a tool is critical (should stop execution on failure)
 */
function isCriticalTool(toolName: string): boolean {
  const criticalTools = [
    "database_delete",
    "delete_message",
    "ban_user",
  ]
  return criticalTools.includes(toolName)
}

/**
 * Log tool execution to database
 */
async function logToolExecution(
  toolCall: { name: string; args: Record<string, any>; id: string },
  result: ToolResult
): Promise<void> {
  try {
    const supabase = createServiceClient()

    await supabase.from("tool_executions").insert({
      tool_name: toolCall.name,
      args: toolCall.args,
      result: result.data,
      success: result.success,
      error_message: result.error,
      execution_time_ms: 0,
    })
  } catch (error) {
    console.error("[v0] Failed to log tool execution:", error)
  }
}

/**
 * Helper to get time range start
 */
function getTimeRangeStart(range: string): string {
  const now = new Date()
  
  switch (range) {
    case "1h":
      now.setHours(now.getHours() - 1)
      break
    case "24h":
      now.setHours(now.getHours() - 24)
      break
    case "7d":
      now.setDate(now.getDate() - 7)
      break
    case "30d":
      now.setDate(now.getDate() - 30)
      break
  }
  
  return now.toISOString()
}
