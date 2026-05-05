import type React from "react"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { verifyAdmin } from "@/lib/admin-auth"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // استثناء صفحة تسجيل الدخول من التحقق
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") || headersList.get("x-invoke-path") || ""
  
  // صفحة login لها layout خاص بها - لا نتدخل هنا
  if (pathname.includes("/admin/login")) {
    return <>{children}</>
  }

  // التحقق من صلاحيات الأدمن على الخادم
  const session = await verifyAdmin()

  if (!session) {
    redirect("/admin/login")
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
