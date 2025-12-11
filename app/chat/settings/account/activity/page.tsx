"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, MessageSquare, Users, LogIn, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface ActivityItem {
  id: string
  type: "message" | "group_join" | "login"
  description: string
  timestamp: string
}

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const loadActivity = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        // Get recent messages
        const { data: messages } = await supabase
          .from("messages")
          .select("id, created_at, groups(name)")
          .eq("sender_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20)

        // Get group joins
        const { data: memberships } = await supabase
          .from("group_members")
          .select("id, joined_at, groups(name)")
          .eq("user_id", user.id)
          .order("joined_at", { ascending: false })
          .limit(10)

        const activityList: ActivityItem[] = []

        messages?.forEach((msg) => {
          activityList.push({
            id: `msg-${msg.id}`,
            type: "message",
            description: `أرسلت رسالة في ${(msg.groups as any)?.name || "مجموعة"}`,
            timestamp: msg.created_at,
          })
        })

        memberships?.forEach((mem) => {
          activityList.push({
            id: `join-${mem.id}`,
            type: "group_join",
            description: `انضممت إلى ${(mem.groups as any)?.name || "مجموعة"}`,
            timestamp: mem.joined_at,
          })
        })

        // Sort by timestamp
        activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        setActivities(activityList.slice(0, 30))
      } catch (error) {
        console.error("Error loading activity:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadActivity()
  }, [supabase, router])

  const getIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="w-4 h-4" />
      case "group_join":
        return <Users className="w-4 h-4" />
      case "login":
        return <LogIn className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
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
          <Activity className="w-6 h-6 text-primary" />
          سجل النشاط
        </h1>
        <p className="text-muted-foreground mt-1">نشاطك الأخير على المنصة</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">النشاط الأخير</CardTitle>
          <CardDescription>آخر 30 نشاط لك</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا يوجد نشاط بعد</p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    {getIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString("ar-EG")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
