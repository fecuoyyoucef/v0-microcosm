import { runAgent } from "../runtime"
import { getAgent, toolsForAgent } from "../registry"
import { schemaPromptFragment } from "../schema-introspect"
import type { AgentInput, AgentRun } from "../types"

export async function analyze({ userId, input, context }: AgentInput): Promise<AgentRun> {
  const spec = getAgent("analyst")
  // Same reasoning as chief: ground the analyst in the real schema so its
  // database_query calls reference real tables.
  const schemaFragment = await schemaPromptFragment()
  const system = schemaFragment ? `${spec.systemPrompt}\n\n${schemaFragment}` : spec.systemPrompt

  return runAgent({
    agent: "analyst",
    model: spec.model,
    system,
    messages: [{ role: "user", content: input }],
    tools: toolsForAgent("analyst"),
    temperature: spec.temperature,
    userId,
    context: typeof context === "string" ? context : JSON.stringify(context ?? {}),
  })
}
