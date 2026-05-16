/**
 * Lightweight hooks that other API routes (or cron jobs) can call when new
 * content arrives. They fire-and-forget the right specialized agent so user
 * requests don't slow down.
 */

import { createServiceClient } from "@/lib/supabase/server"
import { isAgentEnabled } from "./registry"
import { moderate } from "./agents/moderator"
import { support } from "./agents/support"

export async function monitorNewMessage(messageId: string): Promise<void> {
  try {
    if (!(await isAgentEnabled("moderator"))) return

    const supabase = createServiceClient()
    const { data: message } = await supabase
      .from("messages")
      .select("id, content, sender_id, group_id")
      .eq("id", messageId)
      .single()

    if (!message?.content) return
    if (!looksSuspicious(message.content)) return

    const scenario =
      `رسالة جديدة قد تحتاج إشرافاً.\n` +
      `المعرّف: ${message.id}\n` +
      `الخلية: ${message.group_id}\n` +
      `المرسل: ${message.sender_id}\n` +
      `المحتوى: ${message.content.slice(0, 1000)}`

    void moderate({
      input: scenario,
      context: {
        message_id: message.id,
        sender_id: message.sender_id,
        group_id: message.group_id,
      },
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

    const scenario =
      `تذكرة دعم جديدة.\n` +
      `المعرّف: ${ticket.id}\n` +
      `المستخدم: ${ticket.user_id}\n` +
      `الفئة: ${ticket.category}\n` +
      `العنوان: ${ticket.title}\n` +
      `الرسالة: ${(ticket.message ?? "").slice(0, 1500)}`

    void support({
      userId: ticket.user_id,
      input: scenario,
      context: { ticket_id: ticket.id },
    }).catch((err) => console.error("[agents/monitor] support failed:", err))
  } catch (err) {
    console.error("[agents/monitor] monitorNewTicket failed:", err)
  }
}

function looksSuspicious(text: string): boolean {
  const lower = text.toLowerCase()
  if ((lower.match(/https?:\/\//g) ?? []).length >= 3) return true
  if (text.length > 30) {
    const caps = (text.match(/[A-Z]/g) ?? []).length
    if (caps / text.length > 0.7) return true
  }
  const markers = ["spam", "scam", "fuck", "bitch", "nigg", "porn"]
  return markers.some((m) => lower.includes(m))
}
