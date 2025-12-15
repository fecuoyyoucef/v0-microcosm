"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  MessageSquare,
  FolderOpen,
  Vote,
  Layers,
  RefreshCw,
  ArrowUpLeft,
  Bell,
  Sparkles,
  TrendingUp,
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"

interface Stats {
  users: number
  groups: number
  messages: number
  decisions: number
  messagesByLayer: {
    social: number
    coordination: number
    knowledge: number
  }
  activeUsers24h?: number
  newUsersToday?: number
  messagesGrowth?: number
}

interface RecentItem {
  id: string
  display_name?: string
  name?: string
  content?: string
  avatar_url?: string
  created_at: string
  layer?: string
}

interface FeatureStatus {
  total: number
  enabled: number
  disabled: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentItem[]>([])
  const [recentGroups, setRecentGroups] = useState<RecentItem[]>([])
  const [recentMessages, setRecentMessages] = useState<RecentItem[]>([])
  const [featureStatus, setFeatureStatus] = useState<FeatureStatus>({ total: 0, enabled: 0, disabled: 0 })
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats")
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        throw new Error("Failed to fetch stats")
      }
      const data = await res.json()
      setStats(data.stats)
      setRecentUsers(data.recent.users)
      setRecentGroups(data.recent.groups)
      setRecentMessages(data.recent.messages)
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Stats error:", error)
    } finally {
      setLoading(false)
    }
  }, [router])

  const fetchFeatureStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/features")
      if (res.ok) {
        const data = await res.json()
        const features = data.features || []
        setFeatureStatus({
          total: features.length,
          enabled: features.filter((f: any) => f.is_enabled).length,
          disabled: features.filter((f: any) => !f.is_enabled).length,
        })
      }
    } catch (error) {
      console.error("Feature status error:", error)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchFeatureStatus()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats()
      fetchFeatureStatus()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchStats, fetchFeatureStatus])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchStats(), fetchFeatureStatus()])
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    )
  }

  const statCards = [
    {
      label: "المستخدمين",
      value: stats?.users || 0,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      href: "/admin/users",
      change: stats?.newUsersToday ? `+${stats.newUsersToday} اليوم` : null,
    },
    {
      label: "الخلايا",
      value: stats?.groups || 0,
      icon: FolderOpen,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      href: "/admin/cells",
    },
    {
      label: "الرسائل",
      value: stats?.messages || 0,
      icon: MessageSquare,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-500/10",
      href: "/admin/analytics",
      change: stats?.messagesGrowth ? `+${stats.messagesGrowth}%` : null,
    },
    {
      label: "القرارات",
      value: stats?.decisions || 0,
      icon: Vote,
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-500/10",
      href: "/admin/analytics",
    },
  ]

  const totalMessages = stats?.messages || 1
  const socialPercent = ((stats?.messagesByLayer?.social || 0) / totalMessages) * 100
  const coordPercent = ((stats?.messagesByLayer?.coordination || 0) / totalMessages) * 100
  const knowledgePercent = ((stats?.messagesByLayer?.knowledge || 0) / totalMessages) * 100

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-slate-400 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            آخر تحديث: {lastUpdate.toLocaleTimeString("ar-SA")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="bg-slate-900/50 border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{stat.label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{stat.value.toLocaleString()}</p>
                    {stat.change && (
                      <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {stat.change}
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-14 h-14 rounded-2xl ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Features Status & Messages by Layer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Features Status */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <Layers className="w-5 h-5 text-cyan-400" />
              حالة الميزات
            </CardTitle>
            <Link href="/admin/features">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                إدارة
                <ArrowUpLeft className="w-4 h-4 mr-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">إجمالي الميزات</span>
                <span className="text-2xl font-bold text-white">{featureStatus.total}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">مفعلة</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{featureStatus.enabled}</p>
                  <Progress value={(featureStatus.enabled / featureStatus.total) * 100} className="mt-2 bg-slate-700" />
                </div>
                <div className="p-4 rounded-xl bg-slate-500/10 border border-slate-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-400 font-medium">معطلة</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{featureStatus.disabled}</p>
                  <Progress
                    value={(featureStatus.disabled / featureStatus.total) * 100}
                    className="mt-2 bg-slate-700"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages by Layer */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Activity className="w-5 h-5 text-cyan-400" />
              الرسائل حسب الطبقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-400 font-medium">اجتماعية</span>
                  <span className="text-white font-bold">{stats?.messagesByLayer?.social || 0}</span>
                </div>
                <Progress value={socialPercent} className="bg-slate-700" />
                <p className="text-xs text-slate-400 mt-1">{socialPercent.toFixed(1)}% من الإجمالي</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-400 font-medium">تنسيقية</span>
                  <span className="text-white font-bold">{stats?.messagesByLayer?.coordination || 0}</span>
                </div>
                <Progress value={coordPercent} className="bg-slate-700" />
                <p className="text-xs text-slate-400 mt-1">{coordPercent.toFixed(1)}% من الإجمالي</p>
              </div>
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-400 font-medium">معرفية</span>
                  <span className="text-white font-bold">{stats?.messagesByLayer?.knowledge || 0}</span>
                </div>
                <Progress value={knowledgePercent} className="bg-slate-700" />
                <p className="text-xs text-slate-400 mt-1">{knowledgePercent.toFixed(1)}% من الإجمالي</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/admin/features">
          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer hover:scale-105">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Layers className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <span className="font-medium text-white block">إدارة الميزات</span>
                <span className="text-xs text-slate-400">{featureStatus.total} ميزة</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/notifications">
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer hover:scale-105">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <span className="font-medium text-white block">إرسال إشعار</span>
                <span className="text-xs text-slate-400">للجميع</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/ai">
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer hover:scale-105">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <span className="font-medium text-white block">مساعد AI</span>
                <span className="text-xs text-slate-400">تحليل ذكي</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/support">
          <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/10 border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer hover:scale-105">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <span className="font-medium text-white block">رؤى الدعم</span>
                <span className="text-xs text-slate-400">مشاكل المستخدمين</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity Tabs */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            النشاط الأخير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
              <TabsTrigger value="users" className="data-[state=active]:bg-slate-700">
                المستخدمين
              </TabsTrigger>
              <TabsTrigger value="groups" className="data-[state=active]:bg-slate-700">
                الخلايا
              </TabsTrigger>
              <TabsTrigger value="messages" className="data-[state=active]:bg-slate-700">
                الرسائل
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-4">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-blue-500/20 text-blue-400">
                          {user.display_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{user.display_name || "مستخدم"}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(user.created_at).toLocaleDateString("ar-SA")}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">
                        جديد
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="groups" className="mt-4">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {recentGroups.map((group) => (
                    <div key={group.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {group.name?.substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{group.name}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(group.created_at).toLocaleDateString("ar-SA")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="messages" className="mt-4">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {recentMessages.map((msg) => (
                    <div key={msg.id} className="p-3 rounded-lg bg-slate-800/30">
                      <p className="text-white line-clamp-2 text-sm">{msg.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            msg.layer === "social"
                              ? "border-emerald-500/50 text-emerald-400"
                              : msg.layer === "coordination"
                                ? "border-blue-500/50 text-blue-400"
                                : "border-purple-500/50 text-purple-400"
                          }`}
                        >
                          {msg.layer === "social" ? "اجتماعي" : msg.layer === "coordination" ? "تنسيقي" : "معرفي"}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {new Date(msg.created_at).toLocaleDateString("ar-SA")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
