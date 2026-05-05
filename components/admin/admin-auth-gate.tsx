"use client"

import type React from "react"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  
  // السماح بصفحة تسجيل الدخول فقط
  const isLoginPage = pathname === "/admin/login"
  
  useEffect(() => {
    if (!isLoginPage) {
      router.replace("/admin/login")
    }
  }, [isLoginPage, router])
  
  if (isLoginPage) {
    return <>{children}</>
  }
  
  // عرض شاشة تحميل أثناء إعادة التوجيه
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
    </div>
  )
}
