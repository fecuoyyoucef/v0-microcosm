import { createServiceClient } from "@/lib/supabase/server"
import { runAgent } from "./runtime"
import { isAgentEnabled } from "./registry"

/**
 * Lightweight hooks that other API routes (messages, tickets) call when new
 * content arrives. They fire-and-forget the chief agent so user-facing
 * requests don't slow down.
 */

export async function monitorNewMessage(messageId: string): Promise<void> {
  try {
    if (!(await isAgentEnabled("moderator"))) return

    const supabase = createServiceClient()
    const { data: message } = await supabase
      .from("messages")
      .select("id, content, sender_id, group_id, profiles:sender_id(display_name, username)")
      .eq("id", messageId)
      .single()

    if (!message || !message.content) return

    // Quick heuristic pre-filter to avoid wasting tokens on harmless content.
    if (!looksSuspicious(message.content)) return

    const scenario = `رسالة جديدة قد تحتاج إشرافاً.
المعرّف: ${message.id}
الخلية: ${message.group_id}
المرسل: ${message.sender_id}
المحتوى: ${message.content.slice(0, 1000)}`

    // Fire and forget; failures are logged by the runtime.
    void runAgent("moderator", scenario, {
      message_id: message.id,
      sender_id: message.sender_id,
      group_id: message.group_id,
    }).catch((err) => console.error("[agents/monitor] moderator failed:", err))
  } catch (err) {
    console.error("[agents/monitor] monitorNewMessage failed:", err)
  }
}

export async function monitorNewTicket(ticketId: string): Promise<void> {
  try {
    if (!(await isAgentEnabled("support"))) return

    const supabase = createServiceClient()
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, title, message, category, user_id")
      .eq("id", ticketId)
      .single()

    if (!ticket) return

    const scenario = `تذكرة دعم جديدة.
المعرّف: ${ticket.id}
المستخدم: ${ticket.user_id}
الفئة: ${ticket.category}
العنوان: ${ticket.title}
الرسالة: ${(ticket.message ?? "").slice(0, 1500)}`

    void runAgent("support", scenario, {
      ticket_id: ticket.id,
      user_id: ticket.user_id,
    }).catch((err) => console.error("[agents/monitor] support failed:", err))
  } catch (err) {
    console.error("[agents/monitor] monitorNewTicket failed:", err)
  }
}

function looksSuspicious(text: string): boolean {
  const lower = text.toLowerCase()
  // Many URLs → potential spam
  if ((lower.match(/https?:\/\//g) ?? []).length >= 3) return true
  // Excessive uppercase
  if (text.length > 30) {
    const caps = (text.match(/[A-Z]/g) ?? []).length
    if (caps / text.length > 0.7) return true
  }
  // Common abuse markers (keep list short; agent does the real work)
  const markers = ["كس", "نيك", "زبي", "fuck", "bitch", "nigg", "porn"]
  return markers.some((m) => lower.includes(m))
}
