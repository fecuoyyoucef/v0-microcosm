import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: adminData } = await supabase.from("admins").select("role, is_active").eq("email", user.email).single()

  if (!adminData || !adminData.is_active || (adminData.role !== "owner" && adminData.role !== "admin")) {
    redirect("/chat")
  }

  return (
    <div className="min-h-screen bg-slate-950 flex" dir="rtl">
      <AdminSidebar />
      <main className="flex-1 min-h-screen overflow-auto">{children}</main>
    </div>
  )
}
