import type React from "react"

// صفحة تسجيل الدخول بدون تحقق من المصادقة
// الـ proxy.ts يتعامل مع إعادة التوجيه إذا كان المستخدم مسجل دخوله
export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
