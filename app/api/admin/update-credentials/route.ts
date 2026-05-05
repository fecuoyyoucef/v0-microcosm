import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { verifySuperAdmin, hashPassword } from "@/lib/admin-auth"

export async function POST(request: Request) {
  try {
    // التحقق من أن المستخدم super_admin
    const session = await verifySuperAdmin()

    if (!session) {
      return NextResponse.json({ error: "غير مصرح - يجب أن تكون super_admin" }, { status: 403 })
    }

    const supabase = await createClient()
    const { email, password } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 })
    }

    // تحديث بيانات الأدمن - استخدام bcrypt للتشفير
    const updates: { email: string; password_hash?: string; salt?: null } = { email }
    if (password) {
      // التحقق من قوة كلمة المرور
      if (password.length < 12) {
        return NextResponse.json({ error: "كلمة المرور يجب أن تكون 12 حرف على الأقل" }, { status: 400 })
      }
      updates.password_hash = await hashPassword(password)
      updates.salt = null // إزالة الـ salt القديم
    }

    const { error } = await supabase
      .from("admins")
      .update(updates)
      .eq("id", session.id) // استخدام session.id الصحيح

    if (error) {
      console.error("Update error:", error)
      return NextResponse.json({ error: "فشل التحديث" }, { status: 500 })
    }

    // تسجيل النشاط
    await supabase.from("admin_activity_log").insert({
      admin_id: session.id,
      action_type: "update_credentials",
      description: `تم تحديث بيانات الأدمن${email !== session.email ? " (بريد جديد)" : ""}`,
      metadata: {
        old_email: session.email,
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
