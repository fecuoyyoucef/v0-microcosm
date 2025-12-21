import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import type { NotificationType } from "@/lib/types"
import { sendPushNotificationToMany } from "@/lib/firebase-admin-server"

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
    console.error("[Notifications] DB insert error:", error)
    return { success: false, error: error.message }
  }

  try {
    const serviceSupabase = createServiceClient()
    const { data: tokens } = await serviceSupabase.from("fcm_tokens").select("token, user_id").in("user_id", recipients)

    if (tokens && tokens.length > 0) {
      const tokenStrings = tokens.map((t) => t.token)

      console.log(`[Notifications] Sending push to ${tokenStrings.length} tokens for ${recipients.length} users`)

      const pushData: Record<string, string> = {
        type: params.type,
        notification_id: data?.[0]?.id || "",
        priority: params.type === "mention" || params.type === "new_message" ? "high" : "normal",
      }

      if (params.groupId) pushData.group_id = params.groupId
      if (params.messageId) pushData.message_id = params.messageId
      if (params.data) {
        Object.entries(params.data).forEach(([key, value]) => {
          pushData[key] = String(value)
        })
      }

      const result = await sendPushNotificationToMany(tokenStrings, params.title, params.body || params.title, pushData)

      if (result.invalidTokens && result.invalidTokens.length > 0) {
        console.log(`[Notifications] Removing ${result.invalidTokens.length} invalid tokens`)
        await supabase.from("fcm_tokens").delete().in("token", result.invalidTokens)
      }

      console.log(
        `[Notifications] Push results: ${result.success} success, ${result.failure} failed out of ${tokenStrings.length} total`,
      )
    } else {
      console.log("[Notifications] No FCM tokens found for recipients")
    }
  } catch (error) {
    console.error("[Notifications] Push error:", error)
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
