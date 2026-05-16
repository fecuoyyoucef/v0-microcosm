import { runAgent } from "../runtime"
import { getAgent, toolsForAgent } from "../registry"
import type { AgentRun } from "../types"

export async function analyze(query: string, userId?: string): Promise<AgentRun> {
  const spec = getAgent("analyst")
  return runAgent({
    agent: "analyst",
    model: spec.model,
    system: spec.systemPrompt,
    messages: [{ role: "user", content: query }],
    tools: toolsForAgent("analyst"),
    temperature: spec.temperature,
    userId: userId ?? null,
  })
}
