import { type NextRequest, NextResponse } from "next/server"
import { requireGroupMember, requireUser } from "@/lib/api-auth"
import { createServerClient, createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, title, body: notifBody, priority, data, groupId, relatedId } = body
    const auth = groupId ? await requireGroupMember(groupId) : await requireUser()
    if (auth.response) return auth.response

    const userIds = Array.from(new Set((Array.isArray(userId) ? userId : [userId]).filter((id: unknown): id is string => typeof id === "string")))
    if (!userIds.length || userIds.length > 100 || typeof title !== "string" || title.length > 200 || typeof notifBody !== "string" || notifBody.length > 2000) {
      return NextResponse.json({ error: "Invalid notification" }, { status: 400 })
    }
    if (groupId === undefined && (userIds.length !== 1 || userIds[0] !== auth.user!.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (groupId) {
      const service = createServiceClient()
      const { data: members, error: memberError } = await service.from("group_members").select("user_id").eq("group_id", groupId).in("user_id", userIds)
      if (memberError || (members?.length ?? 0) !== userIds.length) {
        return NextResponse.json({ error: "Invalid recipients" }, { status: 403 })
      }
    }

    const supabase = await createServerClient()
    const notifications = userIds.map((uid) => ({
      user_id: uid,
      type,
      title,
      body: notifBody,
      data: { ...(data || {}), priority: priority || "normal" },
      group_id: groupId || null,
      sender_id: auth.user!.id,
      message_id: relatedId || null,
    }))
    const { data: createdNotifications, error } = await supabase.from("notifications").insert(notifications).select()
    if (error) {
      console.error("[Notifications API] Error creating notification", error.code)
      return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
    }

    const cookie = request.headers.get("cookie")
    await Promise.allSettled(userIds.map((uid) => fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ userIds: [uid], title, body: notifBody, data: { ...data, type, groupId: groupId || undefined, notificationId: createdNotifications?.find((notification) => notification.user_id === uid)?.id } }),
    })))

    return NextResponse.json({ success: true, notifications: createdNotifications })
  } catch (error) {
    console.error("[Notifications API] Error", error instanceof Error ? error.name : "unknown")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
