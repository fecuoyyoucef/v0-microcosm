"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Bell, Send, Users, User, Loader2, CheckCircle } from "lucide-react"
import { toast } from "react-toastify"

export default function NotificationsPage() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [target, setTarget] = useState("all")
  const [priority, setPriority] = useState("normal")
  const [sending, setSending] = useState(false)
  const [lastSent, setLastSent] = useState<{ count: number; time: Date } | null>(null)

  const handleSend = async () => {
    if (!title) {
      toast.error("العنوان مطلوب")
      return
    }

    setSending(true)
    try {
      const res = await fetch("/api/admin/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, target, priority }),
      })

      if (res.ok) {
        const data = await res.json()
        setLastSent({ count: data.recipientsCount, time: new Date() })
        toast.success(`تم إرسال الإشعار إلى ${data.recipientsCount} مستخدم`)
        setTitle("")
        setBody("")
      } else {
        toast.error("فشل إرسال الإشعار")
      }
    } catch (error) {
      toast.error("حدث خطأ")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">إرسال الإشعارات</h1>
        <p className="text-slate-400">أرسل إشعارات للمستخدمين</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bell className="w-5 h-5 text-amber-400" />
              إشعار جديد
            </CardTitle>
            <CardDescription className="text-slate-400">أنشئ إشعاراً جديداً وأرسله للمستخدمين</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-white">عنوان الإشعار</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان الإشعار..."
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">محتوى الإشعار (اختياري)</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="محتوى الإشعار..."
                rows={4}
                className="bg-slate-800 border-slate-700 text-white resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">المستهدفون</Label>
              <RadioGroup value={target} onValueChange={setTarget} className="grid grid-cols-2 gap-4">
                <div
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${target === "all" ? "border-cyan-500 bg-cyan-500/10" : "border-slate-700 bg-slate-800"}`}
                  onClick={() => setTarget("all")}
                >
                  <RadioGroupItem value="all" id="all" />
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    <Label htmlFor="all" className="text-white cursor-pointer">
                      جميع المستخدمين
                    </Label>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${target === "active" ? "border-cyan-500 bg-cyan-500/10" : "border-slate-700 bg-slate-800"}`}
                  onClick={() => setTarget("active")}
                >
                  <RadioGroupItem value="active" id="active" />
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-400" />
                    <Label htmlFor="active" className="text-white cursor-pointer">
                      النشطون فقط
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-white">الأولوية</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="low" className="text-white">
                    منخفضة
                  </SelectItem>
                  <SelectItem value="normal" className="text-white">
                    عادية
                  </SelectItem>
                  <SelectItem value="high" className="text-white">
                    عالية
                  </SelectItem>
                  <SelectItem value="urgent" className="text-white">
                    عاجلة
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSend}
              disabled={!title || sending}
              className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  إرسال الإشعار
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview & Stats */}
        <div className="space-y-6">
          {/* Preview */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">معاينة الإشعار</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white">{title || "عنوان الإشعار"}</h4>
                    <p className="text-sm text-slate-400 mt-1">{body || "محتوى الإشعار سيظهر هنا..."}</p>
                    <p className="text-xs text-slate-500 mt-2">الآن</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Last Sent */}
          {lastSent && (
            <Card className="bg-emerald-500/10 border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <div>
                    <p className="font-medium text-emerald-400">تم الإرسال بنجاح</p>
                    <p className="text-sm text-emerald-400/80">
                      تم إرسال الإشعار إلى {lastSent.count} مستخدم في {lastSent.time.toLocaleTimeString("ar-SA")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
