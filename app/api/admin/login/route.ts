import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createHash } from "crypto"

// دالة مقارنة كلمة المرور بشكل آمن (مقاوم لـ timing attacks)
function verifyPassword(input: string, stored: string, salt?: string): boolean {
  // دعم كلمات المرور القديمة (نص عادي - للانتقال فقط)
  if (!salt) {
    // مقارنة بطيئة لمنع timing attacks
    const inputBuf = Buffer.from(input)
    const storedBuf = Buffer.from(stored)
    if (inputBuf.length !== storedBuf.length) return false
    let diff = 0
    for (let i = 0; i < inputBuf.length; i++) diff |= inputBuf[i] ^ storedBuf[i]
    return diff === 0
  }
  // مقارنة مشفرة
  const inputHash = createHash("sha256").update(salt + input).digest("hex")
  const inputBuf = Buffer.from(inputHash)
  const storedBuf = Buffer.from(stored)
  if (inputBuf.length !== storedBuf.length) return false
  let diff = 0
  for (let i = 0; i < inputBuf.length; i++) diff |= inputBuf[i] ^ storedBuf[i]
  return diff === 0
}

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

    const isValidPassword = verifyPassword(password, admin.password_hash, admin.salt ?? undefined)

    if (!isValidPassword) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 })
    }

    // تحديث آخر تسجيل دخول
    await supabase.from("admins").update({ last_login: new Date().toISOString() }).eq("id", admin.id)

    // تسجيل النشاط
    await supabase.from("admin_activity_log").insert({
      admin_id: admin.id,
      action_type: "login",
      description: "تسجيل دخول ناجح",
    })

    // إنشاء token بسيط
    const token = Buffer.from(
      JSON.stringify({
        id: admin.id,
        email: admin.email,
        role: admin.role,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 أيام
      }),
    ).toString("base64")

    // حفظ الجلسة في Cookie
    const cookieStore = await cookies()
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
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
