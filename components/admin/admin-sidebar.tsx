"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Layers,
  Bell,
  Settings,
  TrendingUp,
  LogOut,
  Sparkles,
  Activity,
  HelpCircle,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react"
import Image from "next/image"
import { useState } from "react"

const menuItems = [
  { href: "/admin", icon: LayoutDashboard, label: "لوحة التحكم", exact: true },
  { href: "/admin/users", icon: Users, label: "المستخدمين" },
  { href: "/admin/cells", icon: FolderOpen, label: "الخلايا" },
  { href: "/admin/features", icon: Layers, label: "الميزات" },
  { href: "/admin/analytics", icon: TrendingUp, label: "التحليلات" },
  { href: "/admin/notifications", icon: Bell, label: "الإشعارات" },
  { href: "/admin/support", icon: HelpCircle, label: "الدعم" },
  { href: "/admin/errors", icon: AlertTriangle, label: "الأخطاء" },
  { href: "/admin/ai", icon: Sparkles, label: "الذكاء الاصطناعي" },
  { href: "/admin/logs", icon: Activity, label: "السجلات" },
  { href: "/admin/settings", icon: Settings, label: "الإعدادات" },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname?.startsWith(href)
  }

  return (
    <aside
      className={cn(
        "bg-slate-900/50 border-l border-slate-800 flex flex-col transition-all duration-300",
        "fixed md:relative right-0 top-0 h-screen md:h-auto z-40",
        isCollapsed ? "md:w-16 w-16" : "md:w-64 w-64",
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <Image src="/icons/icon-96x96.png" alt="Logo" width={32} height={32} className="rounded-lg" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-white">Synaptic Space</h1>
              <p className="text-xs text-slate-400">لوحة تحكم المالك</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "h-8 text-slate-400 hover:text-white hover:bg-slate-800",
            isCollapsed ? "w-full px-0 justify-center" : "w-full justify-start gap-2",
          )}
        >
          {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {!isCollapsed && <span className="text-xs">طي القائمة</span>}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full h-10 px-3 text-slate-400 hover:text-white hover:bg-slate-800",
                  isCollapsed ? "justify-center px-0" : "justify-start gap-3",
                  isActive(item.href, item.exact) && "bg-slate-800 text-white",
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5" />
                {!isCollapsed && item.label}
              </Button>
            </Link>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <Link href="/chat">
          <Button
            variant="ghost"
            className={cn(
              "w-full h-10 px-3 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10",
              isCollapsed ? "justify-center px-0" : "justify-start gap-3",
            )}
            title={isCollapsed ? "واجهة المستخدم" : undefined}
          >
            <ArrowLeft className="w-5 h-5" />
            {!isCollapsed && "واجهة المستخدم"}
          </Button>
        </Link>
        <Button
          variant="ghost"
          className={cn(
            "w-full h-10 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10",
            isCollapsed ? "justify-center px-0" : "justify-start gap-3",
          )}
          onClick={handleLogout}
          title={isCollapsed ? "تسجيل الخروج" : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && "تسجيل الخروج"}
        </Button>
      </div>
    </aside>
  )
}
