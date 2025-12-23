"use client"

import { useState, useEffect, useRef } from "react"
import { Switch } from "@/components/ui/switch"
import { Brain } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ChiefAgentContent() {
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

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.totalActions || 0}</div>
            <div className="text-sm text-muted-foreground">إجراءات تم اتخاذها</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.pendingApprovals || 0}</div>
            <div className="text-sm text-muted-foreground">تنتظر الموافقة</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.issuesDetected || 0}</div>
            <div className="text-sm text-muted-foreground">مشاكل تم اكتشافها</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.uptime || "0%"}</div>
            <div className="text-sm text-muted-foreground">وقت التشغيل</div>
          </div>
        </div>
      )}

      {/* Recent Actions */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">الإجراءات الأخيرة</h2>
        {actions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">لا توجد إجراءات حتى الآن</p>
        ) : (
          <div className="space-y-3">
            {actions.slice(0, 5).map((action) => (
              <div key={action.id} className="flex items-center justify-between border-b pb-3">
                <div className="flex-1">
                  <div className="font-medium">{getActionTitle(action.action_type)}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(action.created_at).toLocaleString("ar-EG")}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!action.was_undone && (
                    <button
                      onClick={() => undoAction(action.id)}
                      className="text-xs px-3 py-1 border rounded hover:bg-muted"
                    >
                      تراجع
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat with Agent */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">محادثة الوكيل</h2>
        <div className="border rounded-lg h-96 overflow-y-auto p-4 mb-4 bg-muted/20">
          {chatMessages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">ابدأ محادثة مع الوكيل الرئيسي</p>
          ) : (
            <div className="space-y-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
            placeholder="اكتب رسالتك..."
            className="flex-1 border rounded-lg px-4 py-2"
            disabled={isChatting}
          />
          <button
            onClick={sendChatMessage}
            disabled={isChatting || !chatInput.trim()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isChatting ? "جاري..." : "إرسال"}
          </button>
        </div>
      </div>

      {/* Error Analysis */}
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">تحليل الأخطاء من GitHub</h2>
          <button
            onClick={analyzeErrors}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isAnalyzing ? "جاري التحليل..." : "تحليل الأخطاء"}
          </button>
        </div>
        {errorAnalysis && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">تم تحليل {errorAnalysis.totalTickets || 0} تذكرة</div>
            {errorAnalysis.criticalIssues?.map((issue: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="font-medium">{issue.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{issue.analysis}</div>
                {issue.suggestedFix && (
                  <div className="text-sm mt-2 p-2 bg-muted rounded">
                    <strong>الحل المقترح:</strong> {issue.suggestedFix}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
