"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("youcef192837@gmail.com")
  const [newPassword, setNewPassword] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleReset = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/reset-owner-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword, secretKey }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
      } else {
        setResult({ success: false, message: data.error })
      }
    } catch (error) {
      setResult({ success: false, message: "خطأ في الاتصال بالخادم" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">إعادة تعيين كلمة المرور</h1>
            <p className="text-muted-foreground mt-2">صفحة طوارئ للمالك فقط</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">البريد الإلكتروني</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/50"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">كلمة المرور الجديدة</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-muted/50 pl-10"
                  placeholder="أدخل كلمة المرور الجديدة"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">مفتاح الأمان</label>
              <div className="relative">
                <Input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="bg-muted/50"
                  placeholder="SYNAPTIC_OWNER_RESET_2024"
                  dir="ltr"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">المفتاح الافتراضي: SYNAPTIC_OWNER_RESET_2024</p>
            </div>

            {/* Result */}
            {result && (
              <div
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  result.success
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                )}
                <span>{result.message}</span>
              </div>
            )}

            <Button
              onClick={handleReset}
              disabled={loading || !newPassword || !secretKey}
              className="w-full"
            >
              {loading ? "جاري التحديث..." : "تحديث كلمة المرور"}
            </Button>

            {result?.success && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = "/admin/login")}
              >
                العودة لتسجيل الدخول
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
