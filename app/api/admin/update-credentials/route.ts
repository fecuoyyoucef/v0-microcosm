import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Verify admin session
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")

    if (!adminSession?.value) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    let sessionData
    try {
      sessionData = JSON.parse(adminSession.value)
    } catch {
      return NextResponse.json({ error: "جلسة غير صالحة" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get current admin
    const { data: currentAdmin } = await supabase
      .from("admins")
      .select("*")
      .eq("id", sessionData.adminId)
      .eq("is_active", true)
      .single()

    if (!currentAdmin || currentAdmin.role !== "super_admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 })
    }

    const { email, password } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 })
    }

    // Update admin credentials
    const updates: { email: string; password_hash?: string } = { email }
    if (password) {
      updates.password_hash = password
    }

    const { error } = await supabase.from("admins").update(updates).eq("id", currentAdmin.id)

    if (error) {
      console.error("Update error:", error)
      return NextResponse.json({ error: "فشل التحديث" }, { status: 500 })
    }

    // Log activity
    await supabase.from("admin_activity_log").insert({
      admin_id: currentAdmin.id,
      action_type: "update_credentials",
      description: `تم تحديث بيانات الأدمن${email !== currentAdmin.email ? " (بريد جديد)" : ""}`,
      metadata: {
        old_email: currentAdmin.email,
        new_email: email,
        password_changed: !!password,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update credentials error:", error)
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 })
  }
}
