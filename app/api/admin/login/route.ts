import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import {
  verifyPasswordUniversal,
  hashPassword,
  createAdminToken,
} from "@/lib/admin-auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }, { status: 400 })
    }

    // منع brute force - تأخير ثابت
    await new Promise((r) => setTimeout(r, 500))

    const supabase = await createClient()

    // البحث عن Admin
    const { data: admin, error } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .eq("is_active", true)
      .single()

    if (error || !admin) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 })
    }

    // التحقق من كلمة المرور (يدعم الصيغتين القديمة والجديدة)
    const { valid, needsUpgrade } = await verifyPasswordUniversal(
      password,
      admin.password_hash,
      admin.salt
    )

    if (!valid) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 })
    }

    // ترقية كلمة المرور إلى bcrypt إذا كانت قديمة
    if (needsUpgrade) {
      const newHash = await hashPassword(password)
      await supabase
        .from("admins")
        .update({
          password_hash: newHash,
          salt: null, // إزالة الـ salt القديم
        })
        .eq("id", admin.id)
      console.log("Password upgraded to bcrypt for admin:", admin.email)
    }

    // تحديث آخر تسجيل دخول
    await supabase.from("admins").update({ last_login: new Date().toISOString() }).eq("id", admin.id)

    // تسجيل النشاط
    await supabase.from("admin_activity_log").insert({
      admin_id: admin.id,
      action_type: "login",
      description: "تسجيل دخول ناجح",
    })

    // إنشاء token موقّع وآمن
    const token = createAdminToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    })

    // حفظ الجلسة في Cookie
    const cookieStore = await cookies()
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", // أكثر أماناً
      maxAge: 7 * 24 * 60 * 60, // 7 أيام
      path: "/",
    })

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        display_name: admin.display_name,
      },
    })
  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}
