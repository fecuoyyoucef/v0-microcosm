"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TrendingUp, AlertTriangle, CheckCircle2, Info, Sparkles, RefreshCw, Calendar } from "lucide-react"

interface Insight {
  type: "warning" | "info" | "success"
  message: string
  priority: number
}

interface Recommendation {
  title: string
  description: string
  impact: "high" | "medium" | "low"
  effort: number
}

interface WeeklyReport {
  id: string
  report_date: string
  generated_at: string
  week_stats: {
    active_users: number
    total_messages: number
    active_groups: number
    new_decisions: number
    join_requests: number
    moderation_issues: number
  }
  insights: Insight[]
  recommendations: Recommendation[]
  new_features?: Array<{ feature_key: string; name: string; status: string }>
}

export function WeeklyInsightsPanel() {
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchReport = async () => {
    try {
      const res = await fetch("/api/admin/weekly-insights")
      if (res.ok) {
        const data = await res.json()
        setReport(data.report)
      }
    } catch (error) {
      console.error("Error fetching report:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/weekly-insights", {
        method: "POST",
      })
      if (res.ok) {
        const data = await res.json()
        setReport(data.report)
        alert("تم إنشاء التقرير بنجاح")
      } else {
        alert("فشل إنشاء التقرير")
      }
    } catch (error) {
      console.error("Error generating report:", error)
      alert("حدث خطأ أثناء إنشاء التقرير")
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [])

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
      default:
        return <Info className="w-4 h-4 text-blue-400" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "text-red-400"
      case "medium":
        return "text-yellow-400"
      default:
        return "text-green-400"
    }
  }

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center text-slate-400">جاري التحميل...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            التقرير الأسبوعي الذكي
          </CardTitle>
          <Button
            onClick={generateReport}
            disabled={generating}
            size="sm"
            variant="outline"
            className="gap-2 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "جاري الإنشاء..." : "إنشاء تقرير جديد"}
          </Button>
        </div>
        {report && (
          <div className="flex items-center gap-2 text-sm text-slate-400 mt-2">
            <Calendar className="w-4 h-4" />
            آخر تحديث: {new Date(report.generated_at).toLocaleDateString("ar")}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!report ? (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">لا يوجد تقرير متاح حالياً</p>
            <Button onClick={generateReport} disabled={generating}>
              إنشاء أول تقرير
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {/* إحصائيات الأسبوع */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">إحصائيات الأسبوع</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-400">{report.week_stats.active_users}</div>
                    <div className="text-xs text-slate-400">مستخدم نشط</div>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-400">{report.week_stats.total_messages}</div>
                    <div className="text-xs text-slate-400">رسالة</div>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-400">{report.week_stats.active_groups}</div>
                    <div className="text-xs text-slate-400">خلية نشطة</div>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-400">{report.week_stats.new_decisions}</div>
                    <div className="text-xs text-slate-400">قرار جديد</div>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-400">{report.week_stats.join_requests}</div>
                    <div className="text-xs text-slate-400">طلب انضمام</div>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-400">{report.week_stats.moderation_issues}</div>
                    <div className="text-xs text-slate-400">مشكلة محتوى</div>
                  </div>
                </div>
              </div>

              {/* الرؤى والتنبيهات */}
              {report.insights && report.insights.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">الرؤى والتنبيهات</h3>
                  <div className="space-y-2">
                    {report.insights
                      .sort((a, b) => b.priority - a.priority)
                      .map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30">
                          {getInsightIcon(insight.type)}
                          <div className="flex-1">
                            <p className="text-sm text-slate-200">{insight.message}</p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              أولوية: {insight.priority}/5
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* التوصيات */}
              {report.recommendations && report.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">
                    <TrendingUp className="w-4 h-4 inline mr-2" />
                    توصيات التحسين
                  </h3>
                  <div className="space-y-3">
                    {report.recommendations.map((rec, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-white">{rec.title}</h4>
                          <Badge className={getImpactColor(rec.impact)}>
                            {rec.impact === "high"
                              ? "تأثير عالي"
                              : rec.impact === "medium"
                                ? "تأثير متوسط"
                                : "تأثير منخفض"}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-300 mb-2">{rec.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>الجهد المطلوب:</span>
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${i < rec.effort ? "bg-purple-400" : "bg-slate-600"}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* الميزات الجديدة */}
              {report.new_features && report.new_features.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">ميزات جديدة مكتشفة</h3>
                  <div className="space-y-2">
                    {report.new_features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-green-900/20 border border-green-700/50"
                      >
                        <span className="text-sm text-green-300">{feature.name}</span>
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          جديد
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
