"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { MessageSquare, Loader2, Check, X } from "lucide-react"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const passwordRequirements = [
    { label: "6 أحرف على الأقل", met: password.length >= 6 },
    { label: "حرف كبير واحد على الأقل", met: /[A-Z]/.test(password) },
    { label: "رقم واحد على الأقل", met: /[0-9]/.test(password) },
  ]

  const allRequirementsMet = passwordRequirements.every((r) => r.met)
  const passwordsMatch = password === repeatPassword && repeatPassword.length > 0

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("كلمات المرور غير متطابقة")
      setIsLoading(false)
      return
    }

    if (!allRequirementsMet) {
      setError("كلمة المرور لا تستوفي جميع المتطلبات")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.push("/chat")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "حدث خطأ")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold">تعيين كلمة مرور جديدة</h1>
          <p className="text-muted-foreground">أدخل كلمة المرور الجديدة</p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>كلمة المرور الجديدة</CardTitle>
            <CardDescription>اختر كلمة مرور قوية وآمنة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">كلمة المرور الجديدة</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background"
                    dir="ltr"
                  />
                  {password.length > 0 && (
                    <div className="mt-2 p-3 rounded-lg bg-secondary/50 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground mb-2">متطلبات كلمة المرور:</p>
                      {passwordRequirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {req.met ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                          <span className={req.met ? "text-green-500" : "text-muted-foreground"}>{req.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="repeatPassword">تأكيد كلمة المرور</Label>
                  <Input
                    id="repeatPassword"
                    type="password"
                    required
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    className="bg-background"
                    dir="ltr"
                  />
                  {repeatPassword.length > 0 && (
                    <div className="flex items-center gap-2 text-xs mt-1">
                      {passwordsMatch ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-green-500">كلمات المرور متطابقة</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5 text-destructive" />
                          <span className="text-destructive">كلمات المرور غير متطابقة</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading || !allRequirementsMet || !passwordsMatch}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري التحديث...
                    </>
                  ) : (
                    "تحديث كلمة المرور"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
