"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, RefreshCw, Clock } from "lucide-react"

interface ErrorIssue {
  id: string
  message: string
  level: "error" | "warning" | "info"
  count: number
  lastSeen: string
}

export default function ErrorsWidget() {
  const [errors, setErrors] = useState<ErrorIssue[]>([])
  const [loading, setLoading] = useState(true)

  const fetchErrors = async () => {
    try {
      const res = await fetch("/api/admin/errors-lite?hours=1&limit=10")
      if (res.ok) {
        const data = await res.json()
        setErrors(data.issues || [])
      }
    } catch (error) {
      console.error("Fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchErrors()
    const interval = setInterval(fetchErrors, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" dir="rtl">
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="text-center py-4">
          <h1 className="text-xl font-bold">مراقبة الأخطاء</h1>
          <p className="text-xs text-slate-400 mt-1">بدون تسجيل دخول</p>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-slate-400">
              <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" />
            </div>
          ) : errors.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">لا توجد أخطاء</p>
            </div>
          ) : (
            errors.map((error) => (
              <div key={error.id} className="p-2 rounded-lg bg-slate-800/50 border border-red-500/20">
                <p className="text-xs font-medium line-clamp-2">{error.message}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(error.lastSeen).toLocaleTimeString("ar-SA")}
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    {error.count}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={fetchErrors}
          className="w-full py-2 text-xs rounded-lg bg-slate-700 hover:bg-slate-600 transition"
        >
          تحديث
        </button>
      </div>
    </div>
  )
}
