import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    if (request.nextUrl.pathname.startsWith("/admin") && !request.nextUrl.pathname.startsWith("/admin/login")) {
      const adminSession = request.cookies.get("admin_session")?.value
      if (!adminSession) {
        const url = request.nextUrl.clone()
        url.pathname = "/admin/login"
        return NextResponse.redirect(url)
      }

      // التحقق من صلاحية الجلسة
      try {
        const decoded = JSON.parse(Buffer.from(adminSession, "base64").toString())
        if (decoded.exp < Date.now()) {
          const url = request.nextUrl.clone()
          url.pathname = "/admin/login"
          const response = NextResponse.redirect(url)
          response.cookies.delete("admin_session")
          return response
        }
      } catch {
        const url = request.nextUrl.clone()
        url.pathname = "/admin/login"
        return NextResponse.redirect(url)
      }
    }

    if (request.nextUrl.pathname === "/admin/login") {
      const adminSession = request.cookies.get("admin_session")?.value
      if (adminSession) {
        try {
          const decoded = JSON.parse(Buffer.from(adminSession, "base64").toString())
          if (decoded.exp > Date.now()) {
            const url = request.nextUrl.clone()
            url.pathname = "/admin"
            return NextResponse.redirect(url)
          }
        } catch {
          // Session invalid, continue to login
        }
      }
    }

    // حماية صفحات التطبيق
    if (request.nextUrl.pathname.startsWith("/chat") && !user) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    if (
      user &&
      (request.nextUrl.pathname.startsWith("/auth/login") || request.nextUrl.pathname.startsWith("/auth/sign-up"))
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/chat"
      return NextResponse.redirect(url)
    }
  } catch (error) {
    console.error("[v0] Auth error:", error)
    // Continue anyway - user might be accessing public routes
  }

  return supabaseResponse
}
