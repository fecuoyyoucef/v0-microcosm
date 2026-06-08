import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import type { NotificationType } from "@/lib/types"
import { sendPushNotificationToMany } from "@/lib/firebase-admin-server"
import {
  type NotificationPreferences,
  type CellNotificationSetting,
  shouldSendInApp,
  shouldSendPush,
  isCellMuted,
  channelForType,
} from "@/lib/notifications/preferences"

interface SendNotificationParams {
  userIds: string[]
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, unknown>
  groupId?: string
  senderId?: string
  messageId?: string
  /**
   * When true, use the service-role client for the notifications insert and
   * token cleanup instead of the session client. Required for sessionless
   * callers (e.g. cron / the meeting dispatcher) whose requests have no
   * auth.uid(), which would otherwise be rejected by RLS and silently skip
   * the push step.
   */
  useServiceClient?: boolean
}

/**
 * Bulk-load preferences and per-cell settings for the given users.
 * Uses the service client (RLS bypass) so server can read other users' rows.
 */
async function loadPreferencesForUsers(
  userIds: string[],
  groupId?: string,
): Promise<{
  prefs: Map<string, NotificationPreferences>
  cellSettings: Map<string, CellNotificationSetting>
}> {
  const service = createServiceClient()
  const prefs = new Map<string, NotificationPreferences>()
  const cellSettings = new Map<string, CellNotificationSetting>()

  if (userIds.length === 0) return { prefs, cellSettings }

  const [prefsRes, cellRes] = await Promise.all([
    service.from("notification_preferences").select("*").in("user_id", userIds),
    groupId
      ? service.from("cell_notification_settings").select("*").in("user_id", userIds).eq("group_id", groupId)
      : Promise.resolve({ data: [] as CellNotificationSetting[], error: null }),
  ])

  if (prefsRes.data) {
    for (const row of prefsRes.data as NotificationPreferences[]) {
      prefs.set(row.user_id, row)
    }
  }
  if (cellRes && "data" in cellRes && cellRes.data) {
    for (const row of cellRes.data as CellNotificationSetting[]) {
      cellSettings.set(row.user_id, row)
    }
  }

  return { prefs, cellSettings }
}

export async function sendNotification(params: SendNotificationParams) {
  // Sessionless callers (cron / meeting dispatch) must bypass RLS, otherwise
  // the notifications insert below fails and we never reach the push step.
  const supabase = params.useServiceClient ? createServiceClient() : await createClient()

  const recipients = params.senderId ? params.userIds.filter((id) => id !== params.senderId) : params.userIds

  if (recipients.length === 0) return { success: true, count: 0 }

  // Load preferences + per-cell settings for all recipients
  const { prefs, cellSettings } = await loadPreferencesForUsers(recipients, params.groupId)

  // Filter recipients into in-app and push lists, applying preferences and per-cell mute
  const inAppRecipients: string[] = []
  const pushRecipients: string[] = []

  for (const userId of recipients) {
    const userPrefs = prefs.get(userId) ?? null
    const cellSetting = cellSettings.get(userId) ?? null

    // Per-cell mute / mentions-only takes precedence
    if (isCellMuted(cellSetting, params.type)) {
      continue
    }

    const inAppChannel = shouldSendInApp(userPrefs, params.type)
    if (inAppChannel) {
      inAppRecipients.push(userId)
      if (shouldSendPush(userPrefs, params.type)) {
        pushRecipients.push(userId)
      }
    }
  }

  if (inAppRecipients.length === 0) {
    return { success: true, count: 0, filtered: recipients.length }
  }

  const notifications = inAppRecipients.map((userId) => ({
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

  // Send push only to recipients who allow push (subset of inAppRecipients)
  if (pushRecipients.length > 0) {
    try {
      const serviceSupabase = createServiceClient()
      const { data: tokens } = await serviceSupabase
        .from("fcm_tokens")
        .select("token, user_id")
        .in("user_id", pushRecipients)

      if (tokens && tokens.length > 0) {
        const tokenStrings = tokens.map((t) => t.token)

        const channel = channelForType(params.type)
        const isImportant = channel === "mention" || channel === "decision" || channel === "message"

        const pushData: Record<string, string> = {
          type: params.type,
          notification_id: data?.[0]?.id || "",
          channel,
          priority: isImportant ? "high" : "normal",
        }

        if (params.groupId) pushData.group_id = params.groupId
        if (params.messageId) pushData.message_id = params.messageId
        if (params.data) {
          Object.entries(params.data).forEach(([key, value]) => {
            pushData[key] = String(value)
          })
        }

        const result = await sendPushNotificationToMany(
          tokenStrings,
          params.title,
          params.body || params.title,
          pushData,
        )

        if (result.invalidTokens && result.invalidTokens.length > 0) {
          await supabase.from("fcm_tokens").delete().in("token", result.invalidTokens)
        }

        console.log(
          `[Notifications] Push results: ${result.success} success, ${result.failure} failed of ${tokenStrings.length} tokens (${pushRecipients.length} push-eligible recipients)`,
        )
      }
    } catch (error) {
      console.error("[Notifications] Push error:", error)
    }
  }

  return {
    success: true,
    count: data.length,
    filtered: recipients.length - inAppRecipients.length,
  }
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
