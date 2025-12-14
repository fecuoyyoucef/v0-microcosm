"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, ArrowRight, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function ReportIssuePage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [issueType, setIssueType] = useState("bug")
  const [severity, setSeverity] = useState("medium")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("الرجاء ملء جميع الحقول المطلوبة")
      return
    }

    setSubmitting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Unauthorized")

      const { error } = await supabase.from("user_issue_reports").insert({
        user_id: user.id,
        issue_type: issueType,
        severity,
        title,
        description,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      })

      if (error) throw error

      setSubmitted(true)
      toast.success("تم إرسال التقرير بنجاح. شكراً لمساعدتنا في التحسين!")

      setTimeout(() => {
        router.push("/chat")
      }, 2000)
    } catch (error) {
      console.error("Report error:", error)
      toast.error("فشل إرسال التقرير. حاول مرة أخرى")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700 text-white p-8 text-center">
          <div className="mb-4">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold mb-2">تم إرسال التقرير!</h2>
          <p className="text-slate-300 mb-6">شكراً لك. سنراجع المشكلة في أقرب وقت ممكن.</p>
          <Button onClick={() => router.push("/chat")} className="gap-2">
            العودة للصفحة الرئيسية
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">الإبلاغ عن مشكلة</h1>
          <p className="text-slate-400">ساعدنا في تحسين التطبيق بالإبلاغ عن أي مشكلة تواجهها</p>
        </div>

        <Card className="bg-slate-800 border-slate-700 text-white p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">نوع المشكلة</label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="bug">خطأ تقني (Bug)</SelectItem>
                  <SelectItem value="feature_request">اقتراح ميزة</SelectItem>
                  <SelectItem value="confusion">لم أفهم كيف يعمل شيء</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">مستوى الخطورة</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="low">منخفض - مشكلة صغيرة</SelectItem>
                  <SelectItem value="medium">متوسط - يؤثر على الاستخدام</SelectItem>
                  <SelectItem value="high">عالي - لا أستطيع إكمال مهمة</SelectItem>
                  <SelectItem value="critical">حرج - التطبيق لا يعمل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                العنوان <span className="text-red-400">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: زر الإرسال لا يعمل في صفحة الرسائل"
                className="bg-slate-700 border-slate-600"
                maxLength={200}
              />
              <p className="text-xs text-slate-500 mt-1">{title.length}/200</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                الوصف التفصيلي <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اشرح المشكلة بالتفصيل: ماذا حدث؟ ماذا كنت تتوقع؟ كيف يمكن تكرار المشكلة؟"
                className="bg-slate-700 border-slate-600 min-h-[150px]"
                maxLength={2000}
              />
              <p className="text-xs text-slate-500 mt-1">{description.length}/2000</p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">نصيحة للحصول على حل أسرع:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>اذكر الجهاز الذي تستخدمه (هاتف/كمبيوتر)</li>
                    <li>اذكر المتصفح (Chrome, Safari, Firefox)</li>
                    <li>أضف خطوات تكرار المشكلة إن أمكن</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => router.back()} variant="outline" className="flex-1 bg-transparent">
                إلغاء
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || !description.trim()}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
              >
                {submitting ? "جاري الإرسال..." : "إرسال التقرير"}
              </Button>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            هل تحتاج مساعدة فورية؟{" "}
            <button onClick={() => router.push("/chat")} className="text-cyan-400 hover:underline">
              تحدث مع وكيل الدعم الذكي
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
