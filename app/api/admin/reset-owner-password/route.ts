import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { hashPassword } from "@/lib/admin-auth"

/**
 * إعادة تعيين كلمة مرور المالك
 * هذا endpoint للطوارئ فقط - يجب حذفه بعد الاستخدام
 */
export async function POST(request: Request) {
  try {
    const { email, newPassword, secretKey } = await request.json()

    // التحقق من المفتاح السري (يجب أن يكون معروفاً فقط للمالك)
    const expectedKey = process.env.OWNER_RESET_KEY || "SYNAPTIC_OWNER_RESET_2024"
    if (secretKey !== expectedKey) {
      return NextResponse.json({ error: "مفتاح غير صالح" }, { status: 403 })
    }

    // التحقق من البريد الإلكتروني
    const ownerEmail = process.env.OWNER_EMAIL || "youcef192837@gmail.com"
    if (email !== ownerEmail) {
      return NextResponse.json({ error: "هذا البريد ليس بريد المالك" }, { status: 403 })
    }

    // التحقق من كلمة المرور الجديدة
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 })
    }

    const supabase = await createClient()

    // البحث عن المالك
    const { data: admin, error: findError } = await supabase
      .from("admins")
      .select("id, email, role")
      .eq("email", email)
      .single()

    if (findError || !admin) {
      return NextResponse.json({ error: "المالك غير موجود" }, { status: 404 })
    }

    // تشفير كلمة المرور الجديدة باستخدام bcrypt
    const newHash = await hashPassword(newPassword)

    // تحديث كلمة المرور
    const { error: updateError } = await supabase
      .from("admins")
      .update({ 
        password_hash: newHash, 
        salt: null,
        is_active: true 
      })
      .eq("id", admin.id)

    if (updateError) {
      console.error("Password update error:", updateError)
      return NextResponse.json({ error: "فشل تحديث كلمة المرور" }, { status: 500 })
    }

    // تسجيل النشاط
    await supabase.from("admin_activity_log").insert({
      admin_id: admin.id,
      action_type: "password_reset",
      description: "تم إعادة تعيين كلمة المرور عبر endpoint الطوارئ",
    })

    console.log("[v0] Password reset successful for:", email)
    console.log("[v0] New hash (first 30 chars):", newHash.substring(0, 30))

    return NextResponse.json({ 
      success: true, 
      message: "تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول." 
    })
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 })
  }
}
