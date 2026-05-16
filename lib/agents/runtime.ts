/**
 * Agent runtime loop.
 *
 * This is the heart of the system: a faithful implementation of the
 * OpenAI/Groq tool-calling loop.
 *
 *   1. Send the conversation (plus tool catalog) to the model.
 *   2. If the model emits tool_calls, execute each one server-side,
 *      append the results back into the conversation as `role: "tool"`
 *      messages, and loop.
 *   3. Stop when the model returns a plain text/JSON answer, the
 *      iteration cap is hit, or a tool fails critically.
 *
 * Every step is persisted to `agent_decisions` / `tool_executions` for
 * full auditability.
 */

import { chatCompletion, GroqError } from "./groq-client"
import { executeTool } from "./tools/executor"
import { logRun, logToolExecution } from "./monitoring"
import type {
  AgentRun,
  ChatMessage,
  RunOptions,
  ToolCall,
  ToolResult,
} from "./types"

const DEFAULT_MAX_ITERATIONS = 6
const DEFAULT_MODEL = "llama-3.3-70b-versatile" as const

export async function runAgent(opts: RunOptions): Promise<AgentRun> {
  const runId = crypto.randomUUID()
  const startedAt = Date.now()
  const model = opts.model ?? DEFAULT_MODEL
  const maxIterations = opts.maxIterations ?? DEFAULT_MAX_ITERATIONS

  // Build the rolling message list. We always inject the system prompt first.
  const messages: ChatMessage[] = [
    { role: "system", content: opts.system },
    ...opts.messages,
  ]

  const toolCallsLog: AgentRun["tool_calls"] = []
  let tokensIn = 0
  let tokensOut = 0
  let finalText: string | null = null
  let iteration = 0
  let lastError: string | undefined

  try {
    while (iteration < maxIterations) {
      iteration++

      const response = await chatCompletion({
        model,
        messages,
        tools: opts.tools && !opts.jsonMode ? opts.tools : undefined,
        tool_choice: opts.tools && !opts.jsonMode ? "auto" : undefined,
        temperature: opts.temperature ?? 0.3,
        response_format: opts.jsonMode ? { type: "json_object" } : undefined,
      })

      tokensIn += response.usage.prompt_tokens
      tokensOut += response.usage.completion_tokens

      const choice = response.choices[0]
      if (!choice) {
        throw new Error("Groq returned no choices")
      }

      const assistantMsg = choice.message

      // Case 1: Model wants to call tools.
      if (
        choice.finish_reason === "tool_calls" &&
        assistantMsg.tool_calls &&
        assistantMsg.tool_calls.length > 0
      ) {
        // Push the assistant turn (with tool_calls) before responding to each.
        messages.push({
          role: "assistant",
          content: assistantMsg.content ?? null,
          tool_calls: assistantMsg.tool_calls,
        })

        for (const call of assistantMsg.tool_calls) {
          const { name, args, result } = await executeOneCall(call)
          toolCallsLog.push({ name, args, result })

          // Persist each tool execution row independently. Best-effort: if
          // logging fails we still continue the loop.
          await logToolExecution({
            runId,
            toolName: name,
            args,
            result,
          }).catch((e) => console.error("[agents] tool log failed:", e))

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name,
            content: JSON.stringify(result),
          })

          // If a critical tool failed (e.g. destructive db op), bail out so
          // the model doesn't compound the mistake.
          if (!result.success && isCritical(name)) {
            lastError = `Critical tool ${name} failed: ${result.error}`
            finalText = null
            break
          }
        }

        if (lastError) break
        continue // loop again so the model can react to tool results
      }

      // Case 2: Model produced its final answer.
      finalText = assistantMsg.content ?? ""
      break
    }

    if (!finalText && !lastError && iteration >= maxIterations) {
      lastError = `Reached max iterations (${maxIterations}) without a final answer`
    }
  } catch (err) {
    if (err instanceof GroqError) {
      lastError = `Groq error ${err.status}: ${err.message}`
    } else {
      lastError = err instanceof Error ? err.message : String(err)
    }
    console.error("[agents] runAgent failed:", lastError)
  }

  const run: AgentRun = {
    id: runId,
    agent: opts.agent,
    model,
    user_id: opts.userId ?? null,
    input: opts.messages[opts.messages.length - 1]?.content?.toString() ?? "",
    output: finalText,
    tool_calls: toolCallsLog,
    iterations: iteration,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    duration_ms: Date.now() - startedAt,
    success: !lastError && finalText !== null,
    error: lastError,
  }

  await logRun(run, opts.context).catch((e) =>
    console.error("[agents] run log failed:", e),
  )

  return run
}

async function executeOneCall(
  call: ToolCall,
): Promise<{ name: string; args: Record<string, unknown>; result: ToolResult }> {
  const name = call.function.name
  let args: Record<string, unknown> = {}
  try {
    args = call.function.arguments ? JSON.parse(call.function.arguments) : {}
  } catch (e) {
    return {
      name,
      args: {},
      result: {
        success: false,
        error: `Invalid JSON arguments from model: ${(e as Error).message}`,
      },
    }
  }

  const result = await executeTool(name, args)
  return { name, args, result }
}

function isCritical(toolName: string): boolean {
  return ["database_delete", "ban_user", "database_rpc"].includes(toolName)
}
