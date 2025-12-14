"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, XCircle, Clock, TrendingUp, AlertTriangle, Sparkles } from "lucide-react"

interface Suggestion {
  type: string
  title: string
  description: string
  priority: string
  category: string
  estimated_impact?: string
}

interface WeeklySuggestion {
  id: string
  week_start_date: string
  week_end_date: string
  total_users: number
  total_messages: number
  total_groups: number
  error_count: number
  suggestions: Suggestion[]
  unused_features: string[]
  popular_features: Array<{ key: string; count: number }>
  status: string
  created_at: string
}

export function WeeklySuggestionsPanel() {
  const [suggestions, setSuggestions] = useState<WeeklySuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<WeeklySuggestion | null>(null)
  const [decisions, setDecisions] = useState<Map<number, { decision: string; reason: string }>>(new Map())

  useEffect(() => {
    fetchSuggestions()
  }, [])

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/admin/weekly-suggestions")
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error("Fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateNewSuggestions = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/weekly-suggestions", { method: "POST" })
      if (res.ok) {
        await fetchSuggestions()
        alert("تم توليد الاقتراحات بنجاح!")
      }
    } catch (error) {
      console.error("Generate error:", error)
      alert("فشل توليد الاقتراحات")
    } finally {
      setGenerating(false)
    }
  }

  const saveDecision = async (suggestionId: string, index: number, decision: string, reason: string) => {
    try {
      const res = await fetch("/api/admin/weekly-suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestion_id: suggestionId,
          suggestion_index: index,
          decision,
          reason,
        }),
      })

      if (res.ok) {
        alert("تم حفظ القرار!")
        const newDecisions = new Map(decisions)
        newDecisions.set(index, { decision, reason })
        setDecisions(newDecisions)
      }
    } catch (error) {
      console.error("Save error:", error)
    }
  }

  const priorityColors = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  }

  const typeIcons = {
    improvement: TrendingUp,
    bug: AlertTriangle,
    feature: Sparkles,
    optimization: CheckCircle2,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">الاقتراحات الأسبوعية</h2>
          <p className="text-sm text-muted-foreground">تحليل ذكي واقتراحات للتحسين</p>
        </div>
        <Button onClick={generateNewSuggestions} disabled={generating} className="gap-2">
          <Sparkles className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
          توليد اقتراحات جديدة
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <p>جاري التحميل...</p>
          </CardContent>
        </Card>
      ) : suggestions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">لا توجد اقتراحات بعد</p>
            <Button onClick={generateNewSuggestions}>إنشاء أول اقتراح</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>
                      الأسبوع: {new Date(suggestion.week_start_date).toLocaleDateString("ar")} -{" "}
                      {new Date(suggestion.week_end_date).toLocaleDateString("ar")}
                    </CardTitle>
                    <CardDescription className="mt-2 grid grid-cols-4 gap-4 text-sm">
                      <div>المستخدمين: {suggestion.total_users}</div>
                      <div>الرسائل: {suggestion.total_messages}</div>
                      <div>الخلايا: {suggestion.total_groups}</div>
                      <div>الأخطاء: {suggestion.error_count}</div>
                    </CardDescription>
                  </div>
                  <Badge variant={suggestion.status === "pending" ? "default" : "secondary"}>
                    {suggestion.status === "pending" ? "قيد المراجعة" : "تمت المراجعة"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {suggestion.suggestions.map((item, index) => {
                      const Icon = typeIcons[item.type as keyof typeof typeIcons] || TrendingUp
                      const decision = decisions.get(index)

                      return (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Icon className="w-5 h-5" />
                                <h3 className="font-semibold">{item.title}</h3>
                                <Badge variant={priorityColors[item.priority as keyof typeof priorityColors] as any}>
                                  {item.priority === "high" ? "عالي" : item.priority === "medium" ? "متوسط" : "منخفض"}
                                </Badge>
                                <Badge variant="outline">{item.category}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                              {item.estimated_impact && (
                                <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-2">
                                  الأثر المتوقع: {item.estimated_impact}
                                </p>
                              )}
                            </div>
                          </div>

                          {!decision ? (
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                size="sm"
                                variant="default"
                                className="gap-1"
                                onClick={() => {
                                  const reason = prompt("السبب (اختياري):")
                                  saveDecision(suggestion.id, index, "accepted", reason || "")
                                }}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                قبول
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1"
                                onClick={() => {
                                  const reason = prompt("السبب (اختياري):")
                                  saveDecision(suggestion.id, index, "rejected", reason || "")
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                                رفض
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="gap-1"
                                onClick={() => {
                                  const reason = prompt("السبب (اختياري):")
                                  saveDecision(suggestion.id, index, "deferred", reason || "")
                                }}
                              >
                                <Clock className="w-4 h-4" />
                                تأجيل
                              </Button>
                            </div>
                          ) : (
                            <div className="pt-2 border-t">
                              <Badge
                                variant={
                                  decision.decision === "accepted"
                                    ? "default"
                                    : decision.decision === "rejected"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {decision.decision === "accepted"
                                  ? "✓ مقبول"
                                  : decision.decision === "rejected"
                                    ? "✗ مرفوض"
                                    : "⏸ مؤجل"}
                              </Badge>
                              {decision.reason && (
                                <p className="text-xs text-muted-foreground mt-1">السبب: {decision.reason}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>

                {/* ميزات غير مستخدمة */}
                {suggestion.unused_features.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">⚠️ ميزات غير مستخدمة:</h4>
                    <div className="flex flex-wrap gap-2">
                      {suggestion.unused_features.map((feature) => (
                        <Badge key={feature} variant="outline">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* ميزات شائعة */}
                {suggestion.popular_features.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">🔥 الميزات الأكثر استخداماً:</h4>
                    <div className="flex flex-wrap gap-2">
                      {suggestion.popular_features.map((feature) => (
                        <Badge key={feature.key} variant="default">
                          {feature.key} ({feature.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
