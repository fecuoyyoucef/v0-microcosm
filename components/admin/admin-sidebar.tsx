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
} from "lucide-react"
import Image from "next/image"

const menuItems = [
  { href: "/admin", icon: LayoutDashboard, label: "لوحة التحكم", exact: true },
  { href: "/admin/users", icon: Users, label: "المستخدمين" },
  { href: "/admin/cells", icon: FolderOpen, label: "الخلايا" },
  { href: "/admin/features", icon: Layers, label: "الميزات" },
  { href: "/admin/analytics", icon: TrendingUp, label: "التحليلات" },
  { href: "/admin/notifications", icon: Bell, label: "الإشعارات" },
  { href: "/admin/support", icon: HelpCircle, label: "الدعم" },
  { href: "/admin/ai", icon: Sparkles, label: "الذكاء الاصطناعي" },
  { href: "/admin/logs", icon: Activity, label: "السجلات" },
  { href: "/admin/settings", icon: Settings, label: "الإعدادات" },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname?.startsWith(href)
  }

  return (
    <aside className="w-64 bg-slate-900/50 border-l border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
            <Image src="/icons/icon-96x96.png" alt="Logo" width={32} height={32} className="rounded-lg" />
          </div>
          <div>
            <h1 className="font-bold text-white">Synaptic Space</h1>
            <p className="text-xs text-slate-400">لوحة تحكم المالك</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-10 px-3 text-slate-400 hover:text-white hover:bg-slate-800",
                  isActive(item.href, item.exact) && "bg-slate-800 text-white",
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-10 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          تسجيل الخروج
        </Button>
      </div>
    </aside>
  )
}
