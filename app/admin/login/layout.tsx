import type React from "react"
import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/admin-auth"

export default async function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  // إذا كان المستخدم مسجل دخول بالفعل، وجهه إلى لوحة التحكم
  const session = await getAdminSession()

  if (session) {
    redirect("/admin")
  }

  // عرض صفحة تسجيل الدخول مباشرة بدون layout الأدمن
  return <>{children}</>
}
