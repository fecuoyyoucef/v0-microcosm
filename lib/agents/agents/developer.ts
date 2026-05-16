import { runAgent } from "../runtime"
import { getAgent, toolsForAgent } from "../registry"
import type { AgentInput, AgentRun } from "../types"

export async function diagnose({ userId, input, context }: AgentInput): Promise<AgentRun> {
  const spec = getAgent("developer")
  return runAgent({
    agent: "developer",
    model: spec.model,
    system: spec.systemPrompt,
    messages: [{ role: "user", content: input }],
    tools: toolsForAgent("developer"),
    temperature: spec.temperature,
    userId,
    context: typeof context === "string" ? context : JSON.stringify(context ?? {}),
  })
}
