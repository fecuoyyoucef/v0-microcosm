"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  Bug,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Code,
  TrendingUp,
  Search,
  RefreshCw,
  ChevronLeft,
  ExternalLink,
} from "lucide-react"

interface SentryIssue {
  id: string
  title: string
  culprit: string
  level: "error" | "warning" | "info" | "fatal"
  status: string
  count: string
  userCount: number
  firstSeen: string
  lastSeen: string
  permalink: string
  metadata?: {
    type?: string
    value?: string
  }
}

interface ErrorStats {
  total: number
  last24h: number
  resolved: number
  unresolved: number
}

export default function SentryErrorsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<SentryIssue[]>([])
  const [stats, setStats] = useState<ErrorStats>({
    total: 0,
    last24h: 0,
    resolved: 0,
    unresolved: 0,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("unresolved")
  const [levelFilter, setLevelFilter] = useState("all")

  useEffect(() => {
    fetchErrors()
  }, [statusFilter, levelFilter])

  const fetchErrors = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        level: levelFilter,
      })
      const res = await fetch(`/api/admin/sentry/issues?${params}`)

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        throw new Error("Failed to fetch errors")
      }

      const data = await res.json()
      setErrors(data.issues || [])
      setStats(data.stats || stats)
    } catch (error) {
      console.error("Fetch errors failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const levelConfig = {
    fatal: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/20", label: "فادح" },
    error: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/20", label: "خطأ" },
    warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/20", label: "تحذير" },
    info: { icon: AlertCircle, color: "text-blue-500", bg: "bg-blue-500/20", label: "معلومات" },
  }

  const filteredErrors = errors.filter(
    (error) =>
      error.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.culprit.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-slate-900 text-white" dir="rtl">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin")}
              className="text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <Image src="/icons/icon-96x96.png" alt="Synaptic Space" width={40} height={40} />
            </div>
            <div>
              <h1 className="font-bold text-lg">سجل الأخطاء</h1>
              <p className="text-xs text-slate-400">مراقبة أخطاء التطبيق عبر Sentry</p>
            </div>
          </div>

          <Button onClick={fetchErrors} variant="outline" className="bg-slate-700 border-slate-600 hover:bg-slate-600">
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">إجمالي الأخطاء</p>
                  <p className="text-3xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Bug className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">آخر 24 ساعة</p>
                  <p className="text-3xl font-bold text-white">{stats.last24h}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">محلولة</p>
                  <p className="text-3xl font-bold text-white">{stats.resolved}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">غير محلولة</p>
                  <p className="text-3xl font-bold text-white">{stats.unresolved}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="بحث في الأخطاء..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-700 border-slate-600 pr-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40 bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="unresolved">غير محلولة</SelectItem>
                  <SelectItem value="resolved">محلولة</SelectItem>
                  <SelectItem value="all">الكل</SelectItem>
                </SelectContent>
              </Select>

              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-full md:w-40 bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">كل المستويات</SelectItem>
                  <SelectItem value="fatal">فادح</SelectItem>
                  <SelectItem value="error">خطأ</SelectItem>
                  <SelectItem value="warning">تحذير</SelectItem>
                  <SelectItem value="info">معلومات</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Errors List */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-red-400" />
              الأخطاء المرصودة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-slate-400">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                <p>جاري تحميل الأخطاء...</p>
              </div>
            ) : filteredErrors.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Bug className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد أخطاء</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredErrors.map((error) => {
                  const config = levelConfig[error.level] || levelConfig.error
                  const Icon = config.icon

                  return (
                    <div
                      key={error.id}
                      className="p-4 rounded-xl bg-slate-700/30 border border-slate-600 hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${config.bg} shrink-0`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-medium text-white line-clamp-2">{error.title}</h3>
                            <Badge className={`${config.bg} ${config.color} border-0 shrink-0`}>{config.label}</Badge>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                            <span className="flex items-center gap-1">
                              <Code className="w-3 h-3" />
                              {error.culprit}
                            </span>
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {error.count} مرة
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {error.userCount} مستخدم
                            </span>
                          </div>

                          {error.metadata?.value && (
                            <div className="p-2 rounded bg-slate-800/50 mb-3">
                              <p className="text-xs text-slate-300 font-mono">{error.metadata.value}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>آخر ظهور: {new Date(error.lastSeen).toLocaleString("ar-SA")}</span>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-slate-600 border-slate-500 hover:bg-slate-500 text-xs"
                              onClick={() => window.open(error.permalink, "_blank")}
                            >
                              <ExternalLink className="w-3 h-3 ml-1" />
                              فتح في Sentry
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
