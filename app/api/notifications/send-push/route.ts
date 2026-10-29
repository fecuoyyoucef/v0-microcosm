import { type NextRequest, NextResponse } from "next/server"
import { requireGroupMember, requireUser } from "@/lib/api-auth"
import { createServiceClient } from "@/lib/supabase/server"
import { sendPushNotificationToMany } from "@/lib/firebase-admin-server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userIds, title, body: messageBody, data } = body
    const groupId = typeof data?.groupId === "string" ? data.groupId : typeof data?.group_id === "string" ? data.group_id : null
    const auth = groupId ? await requireGroupMember(groupId) : await requireUser()
    if (auth.response) return auth.response

    if (!Array.isArray(userIds) || userIds.length === 0 || userIds.length > 100) {
      return NextResponse.json({ error: "Invalid recipients" }, { status: 400 })
    }
    if (typeof title !== "string" || title.length === 0 || title.length > 200 || typeof messageBody !== "string" || messageBody.length > 2000) {
      return NextResponse.json({ error: "Invalid notification" }, { status: 400 })
    }

    const uniqueUserIds = Array.from(new Set(userIds.filter((id: unknown): id is string => typeof id === "string")))
    if (!auth.member && (uniqueUserIds.length !== 1 || uniqueUserIds[0] !== auth.user!.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const service = createServiceClient()
    if (groupId) {
      const { data: members, error: memberError } = await service.from("group_members").select("user_id").eq("group_id", groupId).in("user_id", uniqueUserIds)
      if (memberError || (members?.length ?? 0) !== uniqueUserIds.length) {
        return NextResponse.json({ error: "Invalid recipients" }, { status: 403 })
      }
    }
    const { data: tokens, error } = await service.from("fcm_tokens").select("token").in("user_id", uniqueUserIds)
    if (error) throw error
    if (!tokens?.length) return NextResponse.json({ success: true, sent: 0 })

    const result = await sendPushNotificationToMany(tokens.map((token) => token.token), title, messageBody, data)
    if (result.invalidTokens?.length) {
      await service.from("fcm_tokens").delete().in("token", result.invalidTokens)
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[API] Send push error", error instanceof Error ? error.name : "unknown")
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 })
  }
}
