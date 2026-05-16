import { runAgent } from "../runtime"
import { getAgent, toolsForAgent } from "../registry"
import type { AgentInput, AgentRun } from "../types"

export async function moderate({ userId, input, context }: AgentInput): Promise<AgentRun> {
  const spec = getAgent("moderator")

  return runAgent({
    agent: "moderator",
    model: spec.model,
    system: spec.systemPrompt,
    messages: [{ role: "user", content: input }],
    tools: toolsForAgent("moderator"),
    temperature: spec.temperature,
    userId,
    context: typeof context === "string" ? context : JSON.stringify(context ?? {}),
  })
}
