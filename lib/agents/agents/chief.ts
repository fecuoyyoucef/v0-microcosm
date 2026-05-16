/**
 * Chief agent entry point.
 *
 * A thin wrapper around `runAgent` that wires up the chief spec and
 * loads conversation history so the agent remembers context across calls.
 */

import { runAgent } from "../runtime"
import { getAgent, toolsForAgent } from "../registry"
import { loadConversation, saveConversation } from "../memory"
import type { AgentInput, AgentRun, ChatMessage } from "../types"

export async function askChief({ userId, input, context }: AgentInput): Promise<AgentRun> {
  const spec = getAgent("chief")
  const convo = userId ? await loadConversation(userId, "chief") : null
  const history: ChatMessage[] = convo?.history ?? []
  history.push({ role: "user", content: input })

  const contextLine = stringifyContext(context)
  const system = contextLine
    ? `${spec.systemPrompt}\n\n[سياق]\n${contextLine}`
    : spec.systemPrompt

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
