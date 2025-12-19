import { createClient } from "@/lib/supabase/server"
import type { NotificationType } from "@/lib/types"

interface SendNotificationParams {
  userIds: string[]
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, unknown>
  groupId?: string
  senderId?: string
  messageId?: string
}

export async function sendNotification(params: SendNotificationParams) {
  const supabase = await createClient()

  // Filter out the sender from recipients
  const recipients = params.senderId ? params.userIds.filter((id) => id !== params.senderId) : params.userIds

  if (recipients.length === 0) return { success: true, count: 0 }

  const notifications = recipients.map((userId) => ({
    user_id: userId,
    type: params.type,
    title: params.title,
    body: params.body || null,
    data: params.data || {},
    group_id: params.groupId || null,
    sender_id: params.senderId || null,
    message_id: params.messageId || null,
  }))

  const { data, error } = await supabase.from("notifications").insert(notifications).select()

  if (error) {
    console.error("Error sending notifications:", error)
    return { success: false, error: error.message }
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-synaptic-space.vercel.app"
    const pushResponse = await fetch(`${appUrl}/api/notifications/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userIds: recipients,
        title: params.title,
        body: params.body || "",
        data: params.data || {},
      }),
    })

    if (!pushResponse.ok) {
      console.error("Push notification failed:", await pushResponse.text())
    }
  } catch (error) {
    console.error("Push notification error:", error)
  }

  return { success: true, count: data.length }
}

export async function notifyGroupMembers(
  groupId: string,
  excludeUserId: string,
  notification: Omit<SendNotificationParams, "userIds" | "groupId" | "senderId">,
) {
  const supabase = await createClient()

  // Get all group members except the sender
  const { data: members, error } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .neq("user_id", excludeUserId)

  if (error || !members) {
    console.error("Error fetching group members:", error)
    return { success: false, error: error?.message }
  }

  const userIds = members.map((m) => m.user_id)

  if (userIds.length === 0) return { success: true, count: 0 }

  return sendNotification({
    ...notification,
    userIds,
    groupId,
    senderId: excludeUserId,
  })
}
