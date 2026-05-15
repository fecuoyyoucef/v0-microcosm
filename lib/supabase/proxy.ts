import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { createHash, timingSafeEqual } from "crypto"

// التحقق من توقيع الـ token في middleware (بدون استخدام قاعدة البيانات)
function verifyAdminTokenInMiddleware(token: string): { id: string; email: string; role: string; exp: number } | null {
  try {
    const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_JWT_SECRET
    if (!secret) return null

    const parts = token.split(".")
    
    // رفض أي token ليس بصيغة payload.signature
    if (parts.length !== 2) {
      console.warn("Invalid token format - must be payload.signature")
      return null
    }

    const [payloadBase64, signature] = parts
    const payloadString = Buffer.from(payloadBase64, "base64url").toString()

    // التحقق من التوقيع
    const expectedSignature = createHash("sha256").update(payloadString + secret).digest("hex")
    try {
      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        console.warn("Invalid admin token signature")
        return null
      }
    } catch {
      return null
    }

    const payload = JSON.parse(payloadString)

    // التحقق من انتهاء الصلاحية
    if (payload.exp < Date.now()) return null

    return payload
  } catch {
    return null
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // إذا لم تُضبط متغيرات Supabase، نتخطى التحقق من المصادقة بدلاً من رمي خطأ
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[v0] Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Skipping auth middleware.",
    )
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // حماية مسارات /test-push
    if (request.nextUrl.pathname.startsWith("/test-push")) {
      const adminSession = request.cookies.get("admin_session")?.value
      const decoded = adminSession ? verifyAdminTokenInMiddleware(adminSession) : null

      if (!decoded) {
        const url = request.nextUrl.clone()
        url.pathname = "/admin/login"
        url.searchParams.set("redirect", "/test-push")
        const response = NextResponse.redirect(url)
        if (adminSession) response.cookies.delete("admin_session")
        return response
      }
    }

    // حماية مسارات /admin (ما عدا صفحة الدخول)
    if (request.nextUrl.pathname.startsWith("/admin") && !request.nextUrl.pathname.startsWith("/admin/login")) {
      const adminSession = request.cookies.get("admin_session")?.value
      const decoded = adminSession ? verifyAdminTokenInMiddleware(adminSession) : null

      if (!decoded) {
        const url = request.nextUrl.clone()
        url.pathname = "/admin/login"
        const response = NextResponse.redirect(url)
        if (adminSession) response.cookies.delete("admin_session")
        return response
      }
    }

    // إعادة توجيه من صفحة الدخول إذا كان مسجلاً دخوله
    if (request.nextUrl.pathname === "/admin/login") {
      const adminSession = request.cookies.get("admin_session")?.value
      const decoded = adminSession ? verifyAdminTokenInMiddleware(adminSession) : null

      if (decoded) {
        const url = request.nextUrl.clone()
        url.pathname = "/admin"
        return NextResponse.redirect(url)
      }
    }

    // حماية مسارات /chat
    if (request.nextUrl.pathname.startsWith("/chat") && !user) {
      const referer = request.headers.get("referer")
      if (referer && referer.includes("/auth/callback")) {
        return supabaseResponse
      }

      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    // إعادة توجيه المستخدمين المسجلين من صفحات المصادقة
    if (
      user &&
      (request.nextUrl.pathname.startsWith("/auth/login") || request.nextUrl.pathname.startsWith("/auth/sign-up"))
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/chat"
      return NextResponse.redirect(url)
    }
  } catch (error) {
    console.error("[v0] Auth error in middleware:", error)
  }

  return supabaseResponse
}
