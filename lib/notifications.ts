import { createClient } from "@/lib/supabase/client"
import type { NotificationType } from "@/lib/types"

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, unknown>
  groupId?: string
  senderId?: string
  messageId?: string
}

export async function createNotification(params: CreateNotificationParams) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body || null,
      data: params.data || {},
      group_id: params.groupId || null,
      sender_id: params.senderId || null,
      message_id: params.messageId || null,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating notification:", error)
    return null
  }

  return data
}

export async function createBulkNotifications(userIds: string[], params: Omit<CreateNotificationParams, "userId">) {
  const supabase = createClient()

  const notifications = userIds.map((userId) => ({
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
    console.error("Error creating bulk notifications:", error)
    return []
  }

  return data
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)

  return !error
}

export async function markAllNotificationsAsRead(userId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false)

  return !error
}

export async function deleteNotification(notificationId: string) {
  const supabase = createClient()

  const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

  return !error
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)

  if (error) return 0
  return count || 0
}
