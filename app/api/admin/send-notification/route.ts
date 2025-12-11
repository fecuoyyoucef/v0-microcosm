import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

async function verifyAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value
  if (!token) return null

  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString())
    if (decoded.exp < Date.now()) return null
    return decoded
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  try {
    const { title, body, target, priority, actionUrl, actionLabel } = await request.json()

    if (!title) {
      return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get all users
    const { data: users, error: usersError } = await supabase.from("profiles").select("id")

    if (usersError) throw usersError

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "لا يوجد مستخدمين" }, { status: 400 })
    }

    // Create notifications for all users
    const notifications = users.map((user) => ({
      user_id: user.id,
      type: "system",
      title,
      body: body || "",
      data: {
        priority: priority || "normal",
        action_url: actionUrl || null,
        action_label: actionLabel || null,
        sent_by_admin: true,
      },
    }))

    const { error: notifError } = await supabase.from("notifications").insert(notifications)

    if (notifError) {
      console.error("[v0] Notification insert error:", notifError)
      throw notifError
    }

    // Try to save announcement log (may fail if table doesn't exist yet)
    try {
      await supabase.from("system_announcements").insert({
        admin_id: admin.id,
        title,
        body,
        target: target || "all",
        priority: priority || "normal",
        action_url: actionUrl,
        action_label: actionLabel,
        sent_at: new Date().toISOString(),
        recipients_count: users.length,
      })
    } catch (e) {
      console.log("[v0] system_announcements table may not exist, skipping log")
    }

    // Try to log admin activity
    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: admin.id,
        action_type: "send_notification",
        description: `إرسال إشعار: ${title}`,
        metadata: { recipients: users.length, target, priority },
      })
    } catch (e) {
      console.log("[v0] admin_activity_log table may not exist, skipping log")
    }

    return NextResponse.json({
      success: true,
      recipientsCount: users.length,
    })
  } catch (error) {
    console.error("[v0] Send notification error:", error)
    return NextResponse.json({ error: "فشل إرسال الإشعار" }, { status: 500 })
  }
}
