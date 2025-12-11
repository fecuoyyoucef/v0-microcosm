"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Monitor, Smartphone, Globe, Loader2, Check } from "lucide-react"
import { useRouter } from "next/navigation"

interface Session {
  id: string
  device: string
  browser: string
  location: string
  lastActive: string
  isCurrent: boolean
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        // In a real app, you'd fetch actual session data from your auth provider
        // For now, we'll show the current session
        const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
        const isMobile = /Mobile|Android|iPhone/.test(userAgent)
        const browser = userAgent.includes("Chrome")
          ? "Chrome"
          : userAgent.includes("Firefox")
            ? "Firefox"
            : userAgent.includes("Safari")
              ? "Safari"
              : "متصفح آخر"

        setSessions([
          {
            id: "current",
            device: isMobile ? "هاتف محمول" : "كمبيوتر",
            browser: browser,
            location: "الموقع الحالي",
            lastActive: "الآن",
            isCurrent: true,
          },
        ])
      } catch (error) {
        console.error("Error loading sessions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSessions()
  }, [supabase, router])

  const handleSignOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" })
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Monitor className="w-6 h-6 text-primary" />
          الجلسات النشطة
        </h1>
        <p className="text-muted-foreground mt-1">الأجهزة المتصلة بحسابك</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الأجهزة المتصلة</CardTitle>
          <CardDescription>قائمة بالأجهزة التي سجلت الدخول منها</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 border">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                {session.device === "هاتف محمول" ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{session.device}</p>
                  {session.isCurrent && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      الجلسة الحالية
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {session.browser} • {session.location}
                </p>
                <p className="text-xs text-muted-foreground">آخر نشاط: {session.lastActive}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الأمان</CardTitle>
          <CardDescription>إدارة جلسات حسابك</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleSignOutAll} className="w-full">
            <Globe className="w-4 h-4 ml-2" />
            تسجيل الخروج من جميع الأجهزة
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            سيتم تسجيل خروجك من جميع الأجهزة بما فيها هذا الجهاز
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
