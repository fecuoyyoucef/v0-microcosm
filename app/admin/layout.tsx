import type React from "react"
import { verifyAdmin } from "@/lib/admin-auth"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"
import { AdminAuthGate } from "@/components/admin/admin-auth-gate"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // التحقق من صلاحيات الأدمن على الخادم
  const session = await verifyAdmin()

  // إذا لم يكن هناك جلسة، نعرض بوابة المصادقة
  if (!session) {
    return <AdminAuthGate>{children}</AdminAuthGate>
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
