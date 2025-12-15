"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  User,
  Bell,
  Lock,
  Palette,
  Globe,
  Smartphone,
  MessageSquare,
  ChevronRight,
  ArrowRight,
  Activity,
} from "lucide-react"

const settingsItems = [
  {
    category: "الحساب والخصوصية",
    items: [
      { label: "الحساب الشخصي", href: "/chat/settings/account", icon: User },
      { label: "الخصوصية والأمان", href: "/chat/settings/privacy", icon: Lock },
      { label: "نشاط الحساب", href: "/chat/settings/account/activity", icon: Activity },
      { label: "الجلسات النشطة", href: "/chat/settings/account/sessions", icon: Smartphone },
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

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 flex items-center justify-between p-3 border-b bg-card/95 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Link href="/chat">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-sm">الإعدادات</h1>
          </div>
        </div>
        <Button
          variant={mobileMenuOpen ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-xs"
        >
          القوائم
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "w-full md:w-64 border-e bg-card/50 md:flex flex-col transition-all duration-300 md:mt-0 mt-14",
          mobileMenuOpen ? "block" : "hidden md:block",
        )}
      >
        <ScrollArea className="flex-1">
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
                          className={cn(
                            "w-full justify-start text-sm gap-3 h-10",
                            isActive && "bg-primary/10 text-primary",
                          )}
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
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:mt-0 mt-14">
        <div className="max-w-4xl mx-auto p-4">{children}</div>
      </main>
    </div>
  )
}

function cn(...inputs: (string | boolean | undefined)[]) {
  return inputs.filter(Boolean).join(" ")
}
