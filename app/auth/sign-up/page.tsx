"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Loader2, Check, X } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"
import Image from "next/image"

export default function SignUpPage() {
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const passwordRequirements = [
    { label: "6 أحرف على الأقل", met: password.length >= 6 },
    { label: "حرف كبير واحد على الأقل", met: /[A-Z]/.test(password) },
    { label: "رقم واحد على الأقل", met: /[0-9]/.test(password) },
  ]

  const allRequirementsMet = passwordRequirements.every((r) => r.met)
  const passwordsMatch = password === repeatPassword && repeatPassword.length > 0

  const checkNameAvailability = useDebouncedCallback(async (name: string) => {
    if (name.trim().length < 2) {
      setNameAvailable(null)
      return
    }

    setIsCheckingName(true)
    try {
      const { data, error } = await supabase.from("profiles").select("id").ilike("display_name", name.trim()).limit(1)

      if (error) {
        setNameAvailable(null)
      } else {
        setNameAvailable(data.length === 0)
      }
    } catch {
      setNameAvailable(null)
    } finally {
      setIsCheckingName(false)
    }
  }, 500)

  useEffect(() => {
    if (displayName.trim().length >= 2) {
      checkNameAvailability(displayName)
    } else {
      setNameAvailable(null)
    }
  }, [displayName, checkNameAvailability])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
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

    if (nameAvailable === false) {
      setError("اسم العرض مستخدم بالفعل")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
          data: { display_name: displayName.trim() },
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
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
          <Link href="/" className="inline-flex flex-col items-center gap-3 mb-4">
            <Image
              src="/icons/icon-96x96.png"
              alt="Synaptic Space"
              width={72}
              height={72}
              className="rounded-2xl shadow-lg"
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Synaptic Space
            </h1>
          </Link>
          <p className="text-muted-foreground">انضم إلينا وابدأ تجربة جديدة</p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>إنشاء حساب جديد</CardTitle>
            <CardDescription>أنشئ حسابك للبدء</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="displayName">اسم العرض</Label>
                  <div className="relative">
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="اسمك كما سيظهر للآخرين"
                      required
                      minLength={2}
                      maxLength={30}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-background pl-10"
                    />
                    {displayName.length >= 2 && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {isCheckingName ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : nameAvailable === true ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : nameAvailable === false ? (
                          <X className="w-4 h-4 text-destructive" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {displayName.length >= 2 && nameAvailable !== null && (
                    <p className={`text-xs ${nameAvailable ? "text-green-500" : "text-destructive"}`}>
                      {nameAvailable ? "هذا الاسم متاح" : "هذا الاسم مستخدم بالفعل"}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background"
                    dir="ltr"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">كلمة المرور</Label>
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isLoading || !allRequirementsMet || !passwordsMatch || nameAvailable === false || isCheckingName
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري إنشاء الحساب...
                    </>
                  ) : (
                    "إنشاء الحساب"
                  )}
                </Button>
              </div>
              <div className="mt-6 text-center text-sm">
                لديك حساب بالفعل؟{" "}
                <Link href="/auth/login" className="text-primary hover:underline">
                  سجّل دخولك
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
