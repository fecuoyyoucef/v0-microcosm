"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Users, MessageSquare, CheckCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface RecurringPattern {
  id: string
  pattern_type: string
  pattern_description: string
  occurrence_count: number
  affected_users: number
  priority: string
  admin_status: string
  first_seen: string
  last_seen: string
}

interface SupportInsight {
  total_open_issues: number
  critical_issues: number
  common_patterns: RecurringPattern[]
  user_feedback_themes: string[]
  recommended_actions: string[]
}

export function AdminSupportInsights() {
  const [insights, setInsights] = useState<SupportInsight | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchInsights()
  }, [])

  const fetchInsights = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/support-insights")
      if (response.ok) {
        const data = await response.json()
        setInsights(data)
      }
    } catch (error) {
      console.error("Error fetching insights:", error)
      toast.error("فشل تحميل رؤى الدعم")
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (patternId: string) => {
    try {
      const response = await fetch("/api/admin/support-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternId, action: "acknowledge" }),
      })

      if (response.ok) {
        toast.success("تم الاعتراف بالنمط")
        fetchInsights()
      }
    } catch (error) {
      toast.error("فشل تحديث الحالة")
    }
  }

  if (!insights) {
    return (
      <Card className="bg-slate-800 border-slate-700 text-white p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800 border-slate-700 text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-cyan-400" />
          رؤى الدعم والمشاكل
        </h2>
        <Button onClick={fetchInsights} disabled={loading} variant="outline" size="sm" className="gap-2 bg-transparent">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-orange-400" />
            <div>
              <p className="text-2xl font-bold">{insights.total_open_issues}</p>
              <p className="text-sm text-slate-400">مشاكل مفتوحة</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold">{insights.critical_issues}</p>
              <p className="text-sm text-slate-400">حرجة</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold">
                {insights.common_patterns.reduce((sum, p) => sum + p.affected_users, 0)}
              </p>
              <p className="text-sm text-slate-400">مستخدمين متأثرين</p>
            </div>
          </div>
        </Card>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-cyan-400">الأنماط المتكررة</h3>
            {insights.common_patterns.map((pattern) => (
              <Card key={pattern.id} className="bg-slate-700/50 p-4 mb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{pattern.pattern_description}</h4>
                      <Badge
                        variant={
                          pattern.priority === "high"
                            ? "destructive"
                            : pattern.priority === "medium"
                              ? "default"
                              : "outline"
                        }
                      >
                        {pattern.priority === "high" ? "عالي" : pattern.priority === "medium" ? "متوسط" : "منخفض"}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-slate-400 mb-2">
                      <span>{pattern.occurrence_count} مرة</span>
                      <span>{pattern.affected_users} مستخدم</span>
                    </div>
                  </div>
                  {pattern.admin_status === "pending" && (
                    <Button onClick={() => handleAcknowledge(pattern.id)} size="sm" variant="outline" className="gap-2">
                      <CheckCircle className="w-4 h-4" />
                      اعتراف
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-green-400">الإجراءات الموصى بها</h3>
            <div className="space-y-2">
              {insights.recommended_actions.map((action, idx) => (
                <Card key={idx} className="bg-slate-700/50 p-3">
                  <p className="text-sm">{action}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </Card>
  )
}
