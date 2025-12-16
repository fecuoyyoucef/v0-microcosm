"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, Users, MessageSquare, Clock, RefreshCw, BarChart3, PieChart } from "lucide-react"

interface AnalyticsData {
  dailyMessages: { date: string; count: number }[]
  dailyUsers: { date: string; count: number }[]
  topCells: { id: string; name: string; messages: number }[]
  topUsers: { id: string; name: string; messages: number; avatar?: string }[]
  peakHours: { hour: number; count: number }[]
  layerDistribution: { social: number; coordination: number; knowledge: number }
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState("7d")
  const [data, setData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/admin/analytics?range=${timeRange}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        throw new Error("Failed")
      }
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error("Analytics error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalytics()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    )
  }

  const maxMessages = Math.max(...(data?.dailyMessages?.map((d) => d.count) || [1]))
  const maxUsers = Math.max(...(data?.dailyUsers?.map((d) => d.count) || [1]))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">التحليلات</h1>
          <p className="text-slate-400">رؤى تفصيلية عن استخدام التطبيق</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="7d">7 أيام</SelectItem>
              <SelectItem value="30d">30 يوم</SelectItem>
              <SelectItem value="90d">90 يوم</SelectItem>
            </SelectContent>
          </Select>
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
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-900/50">
          <TabsTrigger value="messages" className="data-[state=active]:bg-slate-700 gap-2">
            <MessageSquare className="w-4 h-4" />
            الرسائل
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-slate-700 gap-2">
            <Users className="w-4 h-4" />
            المستخدمين
          </TabsTrigger>
          <TabsTrigger value="cells" className="data-[state=active]:bg-slate-700 gap-2">
            <BarChart3 className="w-4 h-4" />
            الخلايا
          </TabsTrigger>
          <TabsTrigger value="time" className="data-[state=active]:bg-slate-700 gap-2">
            <Clock className="w-4 h-4" />
            الأوقات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-6 space-y-6">
          {/* Messages Chart */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                الرسائل اليومية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end gap-1">
                {data?.dailyMessages?.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t transition-all hover:opacity-80"
                      style={{ height: `${(day.count / maxMessages) * 100}%`, minHeight: "4px" }}
                    />
                    <span className="text-[10px] text-slate-500 rotate-45 origin-right">
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Layer Distribution */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-400" />
                توزيع الطبقات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-emerald-400 font-medium">اجتماعية</p>
                  <p className="text-3xl font-bold text-white mt-2">{data?.layerDistribution?.social || 0}</p>
                  <p className="text-sm text-slate-400">
                    {(
                      ((data?.layerDistribution?.social || 0) /
                        ((data?.layerDistribution?.social || 0) +
                          (data?.layerDistribution?.coordination || 0) +
                          (data?.layerDistribution?.knowledge || 0))) *
                        100 || 0
                    ).toFixed(1)}
                    %
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <p className="text-blue-400 font-medium">تنسيقية</p>
                  <p className="text-3xl font-bold text-white mt-2">{data?.layerDistribution?.coordination || 0}</p>
                  <p className="text-sm text-slate-400">
                    {(
                      ((data?.layerDistribution?.coordination || 0) /
                        ((data?.layerDistribution?.social || 0) +
                          (data?.layerDistribution?.coordination || 0) +
                          (data?.layerDistribution?.knowledge || 0))) *
                        100 || 0
                    ).toFixed(1)}
                    %
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                  <p className="text-purple-400 font-medium">معرفية</p>
                  <p className="text-3xl font-bold text-white mt-2">{data?.layerDistribution?.knowledge || 0}</p>
                  <p className="text-sm text-slate-400">
                    {(
                      ((data?.layerDistribution?.knowledge || 0) /
                        ((data?.layerDistribution?.social || 0) +
                          (data?.layerDistribution?.coordination || 0) +
                          (data?.layerDistribution?.knowledge || 0))) *
                        100 || 0
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6 space-y-6">
          {/* Daily Active Users Chart */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                المستخدمين الجدد يومياً
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end gap-1">
                {data?.dailyUsers?.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:opacity-80"
                      style={{ height: `${(day.count / maxUsers) * 100}%`, minHeight: "4px" }}
                    />
                    <span className="text-[10px] text-slate-500">{new Date(day.date).getDate()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Users */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">أكثر المستخدمين نشاطاً</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.topUsers?.map((user, i) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30">
                    <span className="text-lg font-bold text-slate-500 w-6">{i + 1}</span>
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                      {user.name?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{user.name}</p>
                    </div>
                    <span className="text-emerald-400 font-bold">{user.messages} رسالة</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cells" className="mt-6">
          {/* Top Cells */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">أكثر الخلايا نشاطاً</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.topCells?.map((cell, i) => {
                  const maxCellMessages = Math.max(...(data?.topCells?.map((c) => c.messages) || [1]))
                  const percent = (cell.messages / maxCellMessages) * 100
                  return (
                    <div key={cell.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-slate-500 w-6">{i + 1}</span>
                          <span className="font-medium text-white">{cell.name}</span>
                        </div>
                        <span className="text-purple-400 font-bold">{cell.messages}</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="mt-6">
          {/* Peak Hours */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                ساعات الذروة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end gap-1">
                {Array.from({ length: 24 }).map((_, hour) => {
                  const hourData = data?.peakHours?.find((h) => h.hour === hour)
                  const count = hourData?.count || 0
                  const maxHour = Math.max(...(data?.peakHours?.map((h) => h.count) || [1]))
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${(count / maxHour) * 100}%`, minHeight: "4px" }}
                      />
                      <span className="text-[10px] text-slate-500">{hour}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-center text-sm text-slate-400 mt-4">الساعات (0-23)</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
