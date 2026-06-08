import type { NotificationType } from "@/lib/types"

export type NotificationChannel = "mention" | "message" | "reaction" | "decision" | "system"

export type NotificationPreset = "all" | "important" | "groups" | "mentions" | "none"

export type CellNotificationMode = "all" | "mentions_only" | "muted"

export interface NotificationPreferences {
  user_id: string
  global_enabled: boolean
  push_enabled: boolean
  in_app_enabled: boolean
  sound_enabled: boolean
  desktop_enabled: boolean
  sound_name: string
  channel_mention: boolean
  channel_message: boolean
  channel_reaction: boolean
  channel_decision: boolean
  channel_system: boolean
  push_mention: boolean
  push_message: boolean
  push_reaction: boolean
  push_decision: boolean
  push_system: boolean
  preset: NotificationPreset
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  timezone: string | null
  dnd_until: string | null
  created_at?: string
  updated_at?: string
}

export interface CellNotificationSetting {
  id?: string
  user_id: string
  group_id: string
  mode: CellNotificationMode
  muted_until: string | null
  created_at?: string
  updated_at?: string
}

export const DEFAULT_PREFERENCES: Omit<NotificationPreferences, "user_id"> = {
  global_enabled: true,
  push_enabled: true,
  in_app_enabled: true,
  sound_enabled: true,
  desktop_enabled: true,
  sound_name: "default",
  channel_mention: true,
  channel_message: true,
  channel_reaction: true,
  channel_decision: true,
  channel_system: true,
  push_mention: true,
  push_message: true,
  push_reaction: false,
  push_decision: true,
  push_system: true,
  preset: "all",
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: "UTC",
  dnd_until: null,
}

/**
 * Map notification type to channel category
 */
export function channelForType(type: NotificationType): NotificationChannel {
  switch (type) {
    case "mention":
      return "mention"
    case "new_message":
      return "message"
    case "reaction":
      return "reaction"
    case "decision_created":
    case "decision_closed":
      return "decision"
    case "meeting_reminder":
    case "meeting_started":
    case "meeting_ended":
      // Meetings ride the "decision" channel: important, push-on by default,
      // and surfaced in the "important" preset.
      return "decision"
    default:
      return "system"
  }
}

/**
 * Determine if a time string "HH:MM" falls within a quiet-hours window.
 * Supports overnight windows (e.g. 22:00 -> 07:00).
 */
export function isInQuietHours(
  now: Date,
  startStr: string | null | undefined,
  endStr: string | null | undefined,
  timezone?: string | null,
): boolean {
  if (!startStr || !endStr) return false

  // Get current HH:MM in the user's timezone (best-effort fallback to local time)
  let hh: number
  let mm: number
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone || undefined,
    })
    const parts = fmt.formatToParts(now)
    hh = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10)
    mm = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10)
  } catch {
    hh = now.getHours()
    mm = now.getMinutes()
  }

  const nowMin = hh * 60 + mm
  const [sh, sm] = startStr.split(":").map((n) => parseInt(n, 10))
  const [eh, em] = endStr.split(":").map((n) => parseInt(n, 10))
  if (Number.isNaN(sh) || Number.isNaN(eh)) return false
  const startMin = sh * 60 + (sm || 0)
  const endMin = eh * 60 + (em || 0)

  if (startMin === endMin) return false
  if (startMin < endMin) return nowMin >= startMin && nowMin < endMin
  // Overnight window
  return nowMin >= startMin || nowMin < endMin
}

/**
 * Decide whether to send an in-app notification given the user's preferences.
 * Returns null if not allowed, or the channel name if allowed.
 */
export function shouldSendInApp(
  prefs: NotificationPreferences | null,
  type: NotificationType,
): NotificationChannel | null {
  const channel = channelForType(type)
  if (!prefs) return channel // default = allow when no prefs row

  if (!prefs.global_enabled) return null
  if (!prefs.in_app_enabled) return null

  // Preset gating
  if (prefs.preset === "none") return null
  if (prefs.preset === "mentions" && channel !== "mention") return null
  if (prefs.preset === "important" && channel !== "mention" && channel !== "decision") return null
  if (prefs.preset === "groups" && channel === "system") return null

  // Per-channel toggle
  const channelKey = `channel_${channel}` as keyof NotificationPreferences
  if (prefs[channelKey] === false) return null

  return channel
}

/**
 * Decide whether to send a push notification given preferences + DND + quiet hours.
 */
export function shouldSendPush(
  prefs: NotificationPreferences | null,
  type: NotificationType,
  now: Date = new Date(),
): boolean {
  const channel = shouldSendInApp(prefs, type)
  if (!channel) return false
  if (!prefs) return true // allow by default when no prefs row

  if (!prefs.push_enabled) return false

  // DND
  if (prefs.dnd_until) {
    const until = new Date(prefs.dnd_until)
    if (!Number.isNaN(until.getTime()) && until > now) return false
  }

  // Quiet hours
  if (prefs.quiet_hours_enabled && isInQuietHours(now, prefs.quiet_hours_start, prefs.quiet_hours_end, prefs.timezone)) {
    return false
  }

  // Per-channel push toggle
  const pushKey = `push_${channel}` as keyof NotificationPreferences
  if (prefs[pushKey] === false) return false

  return true
}

/**
 * Apply per-cell mute / mentions-only mode.
 * Returns true if the notification should be filtered OUT.
 */
export function isCellMuted(
  setting: CellNotificationSetting | null | undefined,
  type: NotificationType,
  now: Date = new Date(),
): boolean {
  if (!setting) return false

  // Temporary mute window expired?
  if (setting.muted_until) {
    const until = new Date(setting.muted_until)
    if (!Number.isNaN(until.getTime()) && until < now) return false
  }

  if (setting.mode === "muted") return true
  if (setting.mode === "mentions_only" && type !== "mention") return true
  return false
}
