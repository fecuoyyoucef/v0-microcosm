import type React from "react"

// الحماية تتم في proxy.ts (middleware) وليس هنا
// هذا يتجنب مشكلة الحلقة اللانهائية لأن الـ layout يُنفذ قبل الـ child layouts
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
