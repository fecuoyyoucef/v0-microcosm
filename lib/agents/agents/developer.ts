import { runAgent } from "../runtime"
import { getAgent, toolsForAgent } from "../registry"
import type { AgentRun } from "../types"

export interface DeveloperInput {
  errorMessage: string
  stackTrace?: string
  context?: Record<string, unknown>
  userId?: string
}

export async function diagnose(input: DeveloperInput): Promise<AgentRun> {
  const spec = getAgent("developer")
  const user =
    `حلّل الخطأ التالي:\n` +
    `Message: ${input.errorMessage}\n` +
    (input.stackTrace ? `Stack:\n${input.stackTrace}\n` : "") +
    (input.context ? `Context:\n${JSON.stringify(input.context, null, 2)}\n` : "") +
    `\nاستخدم الأدوات لفحص الكود والـ logs، ثم اقترح إصلاحاً أو افتح issue إن لزم.`

  return runAgent({
    agent: "developer",
    model: spec.model,
    system: spec.systemPrompt,
    messages: [{ role: "user", content: user }],
    tools: toolsForAgent("developer"),
    temperature: spec.temperature,
    userId: input.userId ?? null,
  })
}
