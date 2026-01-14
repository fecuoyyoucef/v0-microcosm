"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, RefreshCw, ChevronLeft, Clock } from "lucide-react"
import { useRouter } from "next/navigation"

interface ErrorIssue {
  id: string
  message: string
  level: "error" | "warning" | "info"
  location: string
  count: number
  firstSeen: string
  lastSeen: string
}

export default function ErrorsMobilePage() {
  const router = useRouter()
  const [errors, setErrors] = useState<ErrorIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [hours, setHours] = useState(1)

  const fetchErrors = async () => {
    try {
      const res = await fetch(`/api/admin/errors-lite?hours=${hours}&limit=30`)
      if (!res.ok) throw new Error("Failed to fetch")

      const data = await res.json()
      setErrors(data.issues || [])
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchErrors()
    const interval = setInterval(fetchErrors, 15000)
    return () => clearInterval(interval)
  }, [hours])

  const levelColor = {
    error: "destructive",
    warning: "secondary",
    info: "outline",
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-800/50 backdrop-blur border-b border-slate-700 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-400">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">سجل الأخطاء</h1>
              <p className="text-xs text-slate-400">
                {lastUpdate && (
                  <>
                    آخر تحديث:{" "}
                    {lastUpdate.toLocaleTimeString("ar-SA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </>
                )}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchErrors} className="shrink-0 bg-transparent">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      {/* Filter */}
      <div className="p-4 border-b border-slate-700 flex gap-2">
        {[1, 3, 6, 24].map((h) => (
          <Button
            key={h}
            variant={hours === h ? "default" : "outline"}
            size="sm"
            onClick={() => setHours(h)}
            className="text-xs"
          >
            {h}س
          </Button>
        ))}
      </div>

      {/* Errors List */}
      <div className="space-y-2 p-4">
        {loading && errors.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
            <p className="text-sm">جاري التحميل...</p>
          </div>
        ) : errors.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد أخطاء</p>
          </div>
        ) : (
          errors.map((error) => (
            <div
              key={error.id}
              className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{error.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{error.location}</p>
                </div>
                <Badge variant={levelColor[error.level]} className="shrink-0 text-xs">
                  {error.count}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(error.lastSeen).toLocaleTimeString("ar-SA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
