import { runAgent } from "../runtime"
import { getAgent, toolsForAgent } from "../registry"
import type { AgentInput, AgentRun } from "../types"

export async function analyze({ userId, input, context }: AgentInput): Promise<AgentRun> {
  const spec = getAgent("analyst")
  return runAgent({
    agent: "analyst",
    model: spec.model,
    system: spec.systemPrompt,
    messages: [{ role: "user", content: input }],
    tools: toolsForAgent("analyst"),
    temperature: spec.temperature,
    userId,
    context: typeof context === "string" ? context : JSON.stringify(context ?? {}),
  })
}
