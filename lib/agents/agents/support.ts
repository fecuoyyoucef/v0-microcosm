import { runAgent } from "../runtime"
import { getAgent, toolsForAgent } from "../registry"
import { loadConversation, saveConversation } from "../memory"
import type { AgentRun, ChatMessage } from "../types"

export async function support(userId: string, message: string): Promise<AgentRun> {
  const spec = getAgent("support")
  const convo = await loadConversation(userId, "support")
  const history: ChatMessage[] = convo?.history ?? []
  history.push({ role: "user", content: message })

  const run = await runAgent({
    agent: "support",
    model: spec.model,
    system: spec.systemPrompt,
    messages: history,
    tools: toolsForAgent("support"),
    temperature: spec.temperature,
    userId,
  })

  if (run.output) {
    history.push({ role: "assistant", content: run.output })
    await saveConversation(userId, "support", history)
  }

  return run
}
