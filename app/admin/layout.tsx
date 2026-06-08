"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"

// AdminLayout wraps every /admin/* page in the sidebar shell, except the
// login route which renders standalone. Auth itself is enforced in proxy.ts
// (middleware), so this layout only handles presentation.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname?.startsWith("/admin/login")) {
    return <>{children}</>
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
