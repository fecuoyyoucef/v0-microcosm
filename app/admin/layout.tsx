import type React from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex" dir="rtl">
      <AdminSidebar />
      <main className="flex-1 min-h-screen overflow-auto">{children}</main>
    </div>
  )
}
