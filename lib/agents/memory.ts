/**
 * Short and long term memory for agents.
 *
 * - Short-term: a sliding window of the most recent rows of
 *   `agent_conversations.conversation_history` (passed to the model directly).
 * - Long-term: a summary stored on the row's `context` jsonb; produced
 *   periodically by the analyst agent.
 */

import { createServiceClient } from "@/lib/supabase/server"
import type { AgentKind, ChatMessage } from "./types"

export interface ConversationRecord {
  id: string
  agent_type: AgentKind
  user_id: string
  history: ChatMessage[]
  context: Record<string, unknown>
}

export async function loadConversation(
  userId: string,
  agent: AgentKind,
): Promise<ConversationRecord | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("agent_conversations")
    .select("id, agent_type, user_id, conversation_history, context")
    .eq("user_id", userId)
    .eq("agent_type", agent)
    .eq("is_active", true)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return {
    id: data.id,
    agent_type: data.agent_type,
    user_id: data.user_id,
    history: Array.isArray(data.conversation_history)
      ? (data.conversation_history as ChatMessage[])
      : [],
    context: (data.context as Record<string, unknown>) ?? {},
  }
}

export async function saveConversation(
  userId: string,
  agent: AgentKind,
  history: ChatMessage[],
  context: Record<string, unknown> = {},
): Promise<string> {
  const supabase = createServiceClient()
  const existing = await loadConversation(userId, agent)
  const trimmed = history.slice(-30) // keep last 30 turns

  if (existing) {
    await supabase
      .from("agent_conversations")
      .update({
        conversation_history: trimmed,
        context,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
    return existing.id
  }

  const { data } = await supabase
    .from("agent_conversations")
    .insert({
      user_id: userId,
      agent_type: agent,
      conversation_history: trimmed,
      context,
      is_active: true,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  return data!.id
}
