import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { userIds, type, title, body: notificationBody, data, groupId, senderId, messageId } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "userIds array is required" }, { status: 400 })
    }

    if (!type || !title) {
      return NextResponse.json({ error: "type and title are required" }, { status: 400 })
    }

    const notifications = userIds.map((userId: string) => ({
      user_id: userId,
      type,
      title,
      body: notificationBody || null,
      data: data || {},
      group_id: groupId || null,
      sender_id: senderId || null,
      message_id: messageId || null,
    }))

    const { data: result, error } = await supabase.from("notifications").insert(notifications).select()

    if (error) {
      console.error("Error creating notifications:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (result && result.length > 0 && process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const pushResponse = await fetch(`${appUrl}/api/notifications/send-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userIds,
            title,
            body: notificationBody || title,
            data: {
              type,
              notification_id: result[0].id,
              action_url: data?.action_url,
              group_id: groupId,
              message_id: messageId,
              priority: data?.priority || "normal",
              ...data,
            },
          }),
        })

        if (pushResponse.ok) {
          console.log("[Notifications] Firebase push sent successfully")
        } else {
          console.error("[Notifications] Firebase push failed:", await pushResponse.text())
        }
      } catch (pushError) {
        console.error("[Notifications] Push notification error:", pushError)
      }
    }

    return NextResponse.json({ success: true, count: result.length })
  } catch (error: any) {
    console.error("Notifications API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    let query = supabase
      .from("notifications")
      .select(`
        *,
        sender:profiles!sender_id(id, display_name, avatar_url),
        group:groups!group_id(id, name, avatar_url)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq("is_read", false)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching notifications:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notifications: data })
  } catch (error: any) {
    console.error("Notifications API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { notificationId, userId, markAllRead } = body

    if (markAllRead && userId) {
      // Mark all notifications as read for a user
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("is_read", false)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (notificationId) {
      // Mark single notification as read
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "notificationId or markAllRead with userId required" }, { status: 400 })
  } catch (error: any) {
    console.error("Notifications API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get("id")
    const userId = searchParams.get("userId")
    const deleteRead = searchParams.get("deleteRead") === "true"

    if (deleteRead && userId) {
      // Delete all read notifications for a user
      const { error } = await supabase.from("notifications").delete().eq("user_id", userId).eq("is_read", true)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (notificationId) {
      // Delete single notification
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "id or deleteRead with userId required" }, { status: 400 })
  } catch (error: any) {
    console.error("Notifications API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
