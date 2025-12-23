"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Activity,
  Brain,
  Shield,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Eye,
  Settings,
  TrendingUp,
  MessageSquare,
  Send,
  Bot,
  User,
  FileCode,
  GitBranch,
  Search,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ChiefAgentPage() {
  const [agent, setAgent] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isChatting, setIsChatting] = useState(false)
  const [errorAnalysis, setErrorAnalysis] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const loadData = async () => {
    try {
      const settingsRes = await fetch("/api/ai-agents/settings")
      const settingsData = await settingsRes.json()

      if (settingsData.agent) {
        setAgent(settingsData.agent)
      }

      const actionsRes = await fetch("/api/ai-agents/undo?list=true")
      const actionsData = await actionsRes.json()
      setActions(actionsData.actions || [])

      const statsRes = await fetch("/api/ai-agents/stats")
      const statsData = await statsRes.json()
      setStats(statsData)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAgent = async (enabled: boolean) => {
    if (isToggling) return

    setIsToggling(true)
    const previousState = agent?.is_active

    setAgent((prev: any) => ({ ...prev, is_active: enabled }))

    try {
      const res = await fetch("/api/ai-agents/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_active: enabled,
          capabilities: agent?.capabilities || [],
          confidence_threshold: agent?.confidence_threshold || 0.85,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setAgent(data.agent)
        toast({
          title: enabled ? "تم تفعيل الوكيل الرئيسي" : "تم إيقاف الوكيل الرئيسي",
          description: enabled ? "الوكيل الآن نشط ويراقب النظام" : "الوكيل متوقف مؤقتاً",
        })
      } else {
        setAgent((prev: any) => ({ ...prev, is_active: previousState }))
        toast({
          title: "خطأ",
          description: data.error || "فشل تحديث إعدادات الوكيل",
          variant: "destructive",
        })
      }
    } catch (error) {
      setAgent((prev: any) => ({ ...prev, is_active: previousState }))
      toast({
        title: "خطأ",
        description: "فشل الاتصال بالخادم",
        variant: "destructive",
      })
    } finally {
      setIsToggling(false)
    }
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatting) return

    const userMessage = chatInput.trim()
    setChatInput("")
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsChatting(true)

    try {
      const res = await fetch("/api/ai-agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      })

      const data = await res.json()

      const agentResponse = data.response || data.error || "عذراً، حدث خطأ غير متوقع."
      setChatMessages((prev) => [...prev, { role: "agent", content: agentResponse }])

      if (!data.success && data.error) {
        toast({
          title: "تحذير",
          description: "حدثت مشكلة في الرد",
          variant: "destructive",
        })
      }
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { role: "agent", content: "عذراً، فشل الاتصال بالخادم. تأكد من اتصالك بالإنترنت." },
      ])
    } finally {
      setIsChatting(false)
    }
  }

  const undoAction = async (actionId: string) => {
    try {
      const res = await fetch("/api/ai-agents/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_id: actionId }),
      })

      if (res.ok) {
        toast({
          title: "تم التراجع بنجاح",
          description: "تمت استعادة كل شيء كما كان",
        })
        loadData()
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل التراجع عن الإجراء",
        variant: "destructive",
      })
    }
  }

  const approveAction = async (actionId: string) => {
    try {
      const res = await fetch("/api/ai-agents/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_id: actionId }),
      })

      if (res.ok) {
        toast({
          title: "تمت الموافقة",
          description: "سيتعلم الوكيل من هذا القرار",
        })
        loadData()
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشلت الموافقة",
        variant: "destructive",
      })
    }
  }

  const analyzeErrors = async () => {
    setIsAnalyzing(true)
    try {
      const res = await fetch("/api/ai-agents/analyze-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (res.ok) {
        setErrorAnalysis(data)
        toast({
          title: "تم التحليل بنجاح",
          description: `تم تحليل ${data.criticalIssues?.length || 0} أخطاء حرجة`,
        })
      } else {
        toast({
          title: "خطأ",
          description: data.error || "فشل تحليل الأخطاء",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل الاتصال بالخادم",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (loading) {
    return <div className="p-6">جاري التحميل...</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8" />
            الوكيل الرئيسي
          </h1>
          <p className="text-muted-foreground mt-2">نائب المالك - يدير ويحمي Synaptic Space تلقائياً</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">الحالة:</span>
            <Switch checked={agent?.is_active ?? false} onCheckedChange={toggleAgent} disabled={isToggling} />
            <span className={agent?.is_active ? "text-green-500" : "text-red-500"}>
              {isToggling ? "جاري..." : agent?.is_active ? "نشط" : "متوقف"}
            </span>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          تحدث مع الوكيل الرئيسي
        </h2>
        <div className="space-y-4">
          <ScrollArea className="h-96 border rounded-lg p-4">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Bot className="w-12 h-12 mb-3 text-cyan-500" />
                <p>مرحباً! أنا الوكيل الرئيسي</p>
                <p className="text-sm">اسألني عن أي شيء متعلق بالمنصة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "agent" && (
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-cyan-500" />
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-lg max-w-[70%] ${
                        msg.role === "user" ? "bg-cyan-500 text-white" : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                ))}
                {isChatting && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-cyan-500 animate-pulse" />
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">يكتب...</p>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </ScrollArea>
          <div className="flex gap-2">
            <Input
              placeholder="اكتب رسالتك هنا..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
              disabled={isChatting}
              className="flex-1"
            />
            <Button onClick={sendChatMessage} disabled={isChatting || !chatInput.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">قرارات اليوم</p>
              <p className="text-2xl font-bold">{stats?.today_actions || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">نسبة الدقة</p>
              <p className="text-2xl font-bold">{stats?.accuracy_rate || 0}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">تم التراجع عنها</p>
              <p className="text-2xl font-bold">{stats?.undone_actions || 0}</p>
            </div>
            <RotateCcw className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">محتوى محمي</p>
              <p className="text-2xl font-bold">{stats?.protected_content || 0}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Error Analysis Panel */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            تحليل الأخطاء من GitHub
          </h2>
          <Button onClick={analyzeErrors} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>جاري التحليل...</>
            ) : (
              <>
                <Search className="w-4 h-4 ml-2" />
                تحليل التذاكر الحالية
              </>
            )}
          </Button>
        </div>

        {errorAnalysis ? (
          <div className="space-y-4">
            {/* Critical Issues */}
            {errorAnalysis.criticalIssues && errorAnalysis.criticalIssues.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-red-500 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  أخطاء حرجة ({errorAnalysis.criticalIssues.length})
                </h3>
                {errorAnalysis.criticalIssues.map((issue: any, idx: number) => (
                  <Card key={idx} className="p-4 border-red-500/50">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="destructive">{issue.severity}</Badge>
                        <Badge variant="outline">ثقة {issue.confidence}%</Badge>
                      </div>
                      <p className="font-semibold">{issue.summary}</p>
                      <div className="text-sm text-muted-foreground">
                        <p className="font-semibold mb-1">الأسباب المحتملة:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {issue.possibleCauses.map((cause: string, i: number) => (
                            <li key={i}>{cause}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-sm">
                        <p className="font-semibold mb-1 flex items-center gap-2">
                          <GitBranch className="w-4 h-4" />
                          الملفات المتأثرة:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {issue.affectedFiles.map((file: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {file}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {issue.suggestedFixes && issue.suggestedFixes.length > 0 && (
                        <div className="text-sm">
                          <p className="font-semibold mb-1">الحلول المقترحة:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {issue.suggestedFixes.map((fix: string, i: number) => (
                              <li key={i} className="text-green-600">
                                {fix}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {issue.recentChanges && (
                        <Badge variant="outline" className="text-orange-500">
                          تم تعديل الملف مؤخراً
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Common Patterns */}
            {errorAnalysis.commonErrors && errorAnalysis.commonErrors.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  الأنماط المتكررة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {errorAnalysis.commonErrors.map((error: any, idx: number) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{error.pattern}</span>
                        <Badge>{error.count} مرات</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {errorAnalysis.recommendations && errorAnalysis.recommendations.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  التوصيات
                </h3>
                <div className="space-y-2">
                  {errorAnalysis.recommendations.map((rec: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 border rounded-lg bg-muted/30 text-center">
            <FileCode className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              انقر على "تحليل التذاكر الحالية" لفحص الأخطاء المُبلغ عنها وربطها بالكود في GitHub
            </p>
            <p className="text-sm text-muted-foreground">
              سيقوم الوكيل بالبحث في المستودع عن الأسباب المحتملة واقتراح حلول
            </p>
          </div>
        )}
      </Card>

      {/* Capabilities Control */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          صلاحيات الوكيل
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {agent?.capabilities?.map((capability: string) => (
            <div key={capability} className="flex items-center gap-2 p-3 border rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">{capability}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">آخر القرارات</h2>
        <div className="space-y-4">
          {actions.length === 0 ? (
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">لا توجد قرارات حتى الآن</p>
            </div>
          ) : (
            actions.slice(0, 10).map((action) => (
              <div
                key={action.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {action.status === "completed" && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        مكتمل
                      </Badge>
                    )}
                    {action.status === "undone" && (
                      <Badge variant="secondary">
                        <RotateCcw className="w-3 h-3 mr-1" />
                        تم التراجع
                      </Badge>
                    )}
                    <Badge variant="outline">ثقة {action.confidence}%</Badge>
                  </div>

                  <p className="font-semibold mb-1">{getActionTitle(action.action_type)}</p>
                  <p className="text-sm text-muted-foreground mb-2">{action.reasoning}</p>
                  <p className="text-xs text-muted-foreground">{new Date(action.created_at).toLocaleString("ar-SA")}</p>
                </div>

                <div className="flex gap-2">
                  {action.status === "completed" && !action.approved_by && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => undoAction(action.id)}>
                        <RotateCcw className="w-4 h-4 ml-2" />
                        تراجع
                      </Button>
                      <Button size="sm" variant="default" onClick={() => approveAction(action.id)}>
                        <CheckCircle className="w-4 h-4 ml-2" />
                        موافق
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* v0 Integration Status */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          طلبات v0 (تحتاج موافقة)
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          عند اكتشاف أخطاء معقدة، سيطلب الوكيل موافقتك قبل إرسال الطلب إلى v0 للإصلاح
        </p>
        <div className="space-y-3">
          <div className="p-4 border rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">لا توجد طلبات معلقة حالياً</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function getActionTitle(actionType: string): string {
  const titles: Record<string, string> = {
    delete_message: "حذف رسالة",
    ban_user: "حظر مستخدم",
    delete_cell: "حذف خلية",
    warn_user: "تحذير مستخدم",
    hide_content: "إخفاء محتوى",
    freeze_cell: "تجميد خلية",
  }
  return titles[actionType] || actionType
}
