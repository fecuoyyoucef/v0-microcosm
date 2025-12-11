"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  User,
  Bell,
  Lock,
  Palette,
  Globe,
  Smartphone,
  MessageSquare,
  ChevronRight,
  Settings,
  ArrowRight,
} from "lucide-react"

const settingsItems = [
  {
    category: "الحساب والخصوصية",
    items: [
      { label: "الحساب الشخصي", href: "/chat/settings/account", icon: User },
      { label: "الخصوصية والأمان", href: "/chat/settings/privacy", icon: Lock },
      { label: "الجلسات النشطة", href: "/chat/settings/sessions", icon: Smartphone },
    ],
  },
  {
    category: "التطبيق والإشعارات",
    items: [
      { label: "الإشعارات", href: "/chat/settings/notifications", icon: Bell },
      { label: "المظهر والمواضيع", href: "/chat/settings/appearance", icon: Palette },
      { label: "اللغة والمنطقة", href: "/chat/settings/language", icon: Globe },
    ],
  },
  {
    category: "المحادثات والوسائط",
    items: [{ label: "إعدادات المحادثات", href: "/chat/settings/chats", icon: MessageSquare }],
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card/50">
        <div className="flex items-center gap-2">
          <Link href="/chat">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-sm">الإعدادات</h1>
            <p className="text-xs text-muted-foreground">إدارة إعداداتك وتفضيلاتك</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="h-8 w-8">
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`w-full md:w-64 border-e bg-card/50 overflow-auto transition-all duration-300
          ${mobileMenuOpen ? "block" : "hidden md:block"} h-[calc(100vh-120px)] md:h-auto md:flex-shrink-0`}
      >
        <nav className="p-3 space-y-6">
          {settingsItems.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                {group.category}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={`w-full justify-start text-sm gap-3 ${isActive ? "bg-primary/10 text-primary" : ""}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1 text-right">{item.label}</span>
                        {isActive && <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl">{children}</div>
      </main>
    </div>
  )
}
