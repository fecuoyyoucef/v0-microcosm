"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RefreshCw, Activity, AlertTriangle, Info, CheckCircle } from "lucide-react"

interface LogEntry {
  id: string
  type: "info" | "warning" | "error" | "success"
  message: string
  source: string
  created_at: string
  metadata?: Record<string, any>
}

export default function LogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/logs")
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        throw new Error("Failed")
      }
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error("Logs error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchLogs()
    setRefreshing(false)
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === "all" || log.type === filterType
    return matchesSearch && matchesType
  })

  const getLogIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-400" />
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />
      case "success":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />
      default:
        return <Info className="w-4 h-4 text-blue-400" />
    }
  }

  const getLogColor = (type: string) => {
    switch (type) {
      case "error":
        return "border-red-500/50 text-red-400"
      case "warning":
        return "border-amber-500/50 text-amber-400"
      case "success":
        return "border-emerald-500/50 text-emerald-400"
      default:
        return "border-blue-500/50 text-blue-400"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            سجلات النظام
          </h1>
          <p className="text-slate-400">{logs.length} سجل</p>
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

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في السجلات..."
            className="pr-10 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="النوع" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="info">معلومات</SelectItem>
            <SelectItem value="success">نجاح</SelectItem>
            <SelectItem value="warning">تحذير</SelectItem>
            <SelectItem value="error">خطأ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {["info", "success", "warning", "error"].map((type) => {
          const count = logs.filter((l) => l.type === type).length
          return (
            <Card key={type} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                {getLogIcon(type)}
                <div>
                  <p className="text-xs text-slate-400 capitalize">
                    {type === "info" ? "معلومات" : type === "success" ? "نجاح" : type === "warning" ? "تحذير" : "أخطاء"}
                  </p>
                  <p className="text-xl font-bold text-white">{count}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Logs List */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y divide-slate-800">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">لا توجد سجلات</div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-start gap-3">
                      {getLogIcon(log.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-xs ${getLogColor(log.type)}`}>
                            {log.type === "info"
                              ? "معلومات"
                              : log.type === "success"
                                ? "نجاح"
                                : log.type === "warning"
                                  ? "تحذير"
                                  : "خطأ"}
                          </Badge>
                          <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                            {log.source}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(log.created_at).toLocaleString("ar-SA")}
                          </span>
                        </div>
                        <p className="text-white text-sm">{log.message}</p>
                        {log.metadata && (
                          <pre className="mt-2 p-2 bg-slate-800/50 rounded text-xs text-slate-400 overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
