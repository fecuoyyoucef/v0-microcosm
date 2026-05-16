import { runAgent } from "../runtime"
import { getAgent, toolsForAgent } from "../registry"
import { loadConversation, saveConversation } from "../memory"
import type { AgentInput, AgentRun, ChatMessage } from "../types"

export async function support({ userId, input, context }: AgentInput): Promise<AgentRun> {
  const spec = getAgent("support")
  const convo = userId ? await loadConversation(userId, "support") : null
  const history: ChatMessage[] = convo?.history ?? []
  history.push({ role: "user", content: input })

  const run = await runAgent({
    agent: "support",
    model: spec.model,
    system: spec.systemPrompt,
    messages: history,
    tools: toolsForAgent("support"),
    temperature: spec.temperature,
    userId,
    context: typeof context === "string" ? context : JSON.stringify(context ?? {}),
  })

  if (userId && run.output) {
    history.push({ role: "assistant", content: run.output })
    await saveConversation(userId, "support", history)
  }

  return run
}
