import type React from "react"
import { redirect } from "next/navigation"
import { verifyAdmin } from "@/lib/admin-auth"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // التحقق من صلاحيات الأدمن على الخادم
  const session = await verifyAdmin()

  if (!session) {
    redirect("/admin/login")
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
