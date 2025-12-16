"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Activity, Brain, Shield, AlertTriangle, CheckCircle, RotateCcw, Eye, Settings, TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ChiefAgentPage() {
  const [agent, setAgent] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load agent settings
      const settingsRes = await fetch("/api/ai-agents/settings")
      const settingsData = await settingsRes.json()
      setAgent(settingsData.agent)

      // Load recent actions
      const actionsRes = await fetch("/api/ai-agents/undo?list=true")
      const actionsData = await actionsRes.json()
      setActions(actionsData.actions || [])

      // Load stats
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
    try {
      const res = await fetch("/api/ai-agents/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_active: enabled,
          capabilities: agent.capabilities,
          confidence_threshold: agent.config?.confidence_threshold || 80,
        }),
      })

      if (res.ok) {
        toast({
          title: enabled ? "تم تفعيل الوكيل الرئيسي" : "تم إيقاف الوكيل الرئيسي",
          description: enabled ? "الوكيل الآن نشط ويراقب النظام" : "الوكيل متوقف مؤقتاً",
        })
        loadData()
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث إعدادات الوكيل",
        variant: "destructive",
      })
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
            <Switch checked={agent?.is_active} onCheckedChange={toggleAgent} />
            <span className={agent?.is_active ? "text-green-500" : "text-red-500"}>
              {agent?.is_active ? "نشط" : "متوقف"}
            </span>
          </div>
        </div>
      </div>

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
          {actions.slice(0, 10).map((action) => (
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
                  <Badge
                    variant={
                      action.severity === "critical"
                        ? "destructive"
                        : action.severity === "high"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {action.severity}
                  </Badge>
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(`/admin/chief-agent/action/${action.id}`, "_blank")}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
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
          {/* This would be populated with actual pending requests */}
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
