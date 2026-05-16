/**
 * Chief agent entry point.
 *
 * A thin wrapper around `runAgent` that wires up the chief spec and
 * conversation memory. Other agents follow the same pattern.
 */

import { runAgent } from "../runtime"
import { getAgent, toolsForAgent } from "../registry"
import { loadConversation, saveConversation } from "../memory"
import type { AgentRun, ChatMessage } from "../types"

export interface ChiefInput {
  userId: string
  message: string
  /** Optional extra system context appended to the base prompt. */
  context?: string
}

export async function askChief(input: ChiefInput): Promise<AgentRun> {
  const spec = getAgent("chief")
  const convo = await loadConversation(input.userId, "chief")
  const history: ChatMessage[] = convo?.history ?? []
  history.push({ role: "user", content: input.message })

  const run = await runAgent({
    agent: "chief",
    model: spec.model,
    system: input.context ? `${spec.systemPrompt}\n\n${input.context}` : spec.systemPrompt,
    messages: history,
    tools: toolsForAgent("chief"),
    temperature: spec.temperature,
    userId: input.userId,
    context: input.context,
  })

  if (run.output) {
    history.push({ role: "assistant", content: run.output })
    await saveConversation(input.userId, "chief", history)
  }

  return run
}
