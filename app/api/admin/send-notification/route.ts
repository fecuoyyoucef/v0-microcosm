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

    // جلب جميع المستخدمين
    const { data: users, error: usersError } = await supabase.from("profiles").select("id")

    if (usersError) throw usersError

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "لا يوجد مستخدمين" }, { status: 400 })
    }

    // إنشاء الإشعارات
    const notifications = users.map((user) => ({
      user_id: user.id,
      type: "system",
      title,
      body,
      data: {
        priority,
        action_url: actionUrl,
        action_label: actionLabel,
      },
    }))

    const { error: notifError } = await supabase.from("notifications").insert(notifications)

    if (notifError) throw notifError

    // حفظ في سجل الإعلانات
    await supabase.from("system_announcements").insert({
      admin_id: admin.id,
      title,
      body,
      target,
      priority,
      action_url: actionUrl,
      action_label: actionLabel,
      sent_at: new Date().toISOString(),
      recipients_count: users.length,
    })

    // تسجيل النشاط
    await supabase.from("admin_activity_log").insert({
      admin_id: admin.id,
      action_type: "send_notification",
      description: `إرسال إشعار: ${title}`,
      metadata: { recipients: users.length, target, priority },
    })

    return NextResponse.json({
      success: true,
      recipientsCount: users.length,
    })
  } catch (error) {
    console.error("Send notification error:", error)
    return NextResponse.json({ error: "فشل إرسال الإشعار" }, { status: 500 })
  }
}
