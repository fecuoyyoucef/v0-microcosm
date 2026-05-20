/**
 * Chief agent entry point.
 *
 * A thin wrapper around `runAgent` that wires up the chief spec and
 * loads conversation history so the agent remembers context across calls.
 */

import { runAgent } from "../runtime"
import { getAgent, toolsForAgent } from "../registry"
import { loadConversation, saveConversation } from "../memory"
import { schemaPromptFragment } from "../schema-introspect"
import type { AgentInput, AgentRun, ChatMessage } from "../types"

export async function askChief({ userId, input, context }: AgentInput): Promise<AgentRun> {
  const spec = getAgent("chief")
  const convo = userId ? await loadConversation(userId, "chief") : null
  const history: ChatMessage[] = convo?.history ?? []
  history.push({ role: "user", content: input })

  // Inject the real public-schema table list so the model never invents
  // names. Without this we've seen calls like database_query({ table: "بلاغات" })
  // which obviously fail.
  const schemaFragment = await schemaPromptFragment()
  const contextLine = stringifyContext(context)

  const systemParts = [spec.systemPrompt]
  if (schemaFragment) systemParts.push(schemaFragment)
  if (contextLine) systemParts.push(`[سياق]\n${contextLine}`)
  const system = systemParts.join("\n\n")

  const run = await runAgent({
    agent: "chief",
    model: spec.model,
    system,
    messages: history,
    tools: toolsForAgent("chief"),
    temperature: spec.temperature,
    userId,
    context: contextLine,
  })

  if (userId && run.output) {
    history.push({ role: "assistant", content: run.output })
    await saveConversation(userId, "chief", history)
  }

  return run
}

function stringifyContext(c: AgentInput["context"]): string | undefined {
  if (!c) return undefined
  if (typeof c === "string") return c
  return JSON.stringify(c)
}
