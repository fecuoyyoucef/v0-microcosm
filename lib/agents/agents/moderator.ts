import { runAgent } from "../runtime"
import { getAgent, toolsForAgent } from "../registry"
import type { AgentRun } from "../types"

export interface ModerationInput {
  messageId?: string
  content: string
  authorId?: string
}

export async function moderate(input: ModerationInput): Promise<AgentRun> {
  const spec = getAgent("moderator")
  const user = `راجع الرسالة التالية وقرر:\n` +
    `- message_id: ${input.messageId ?? "غير معروف"}\n` +
    `- author: ${input.authorId ?? "غير معروف"}\n` +
    `- content: ${input.content}\n\n` +
    `استخدم moderate_message ثم نفّذ الإجراء المناسب.`

  return runAgent({
    agent: "moderator",
    model: spec.model,
    system: spec.systemPrompt,
    messages: [{ role: "user", content: user }],
    tools: toolsForAgent("moderator"),
    temperature: spec.temperature,
    userId: input.authorId ?? null,
  })
}
