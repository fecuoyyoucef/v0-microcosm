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
import { Loader2, Check, X, AtSign } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"
import Image from "next/image"
import { LegalConsentCheckbox } from "@/components/auth/legal-consent-checkbox"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function SignUpPage() {
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const passwordRequirements = [
    { label: "6 أحرف على الأقل", met: password.length >= 6 },
    { label: "حرف كبير واحد على الأقل", met: /[A-Z]/.test(password) },
    { label: "رقم واحد على الأقل", met: /[0-9]/.test(password) },
  ]

  const allRequirementsMet = passwordRequirements.every((r) => r.met)
  const passwordsMatch = password === repeatPassword && repeatPassword.length > 0

  const usernameRequirements = [
    { label: "3-20 حرف", met: username.length >= 3 && username.length <= 20 },
    { label: "أحرف إنجليزية وأرقام و _ فقط", met: /^[a-zA-Z0-9_]*$/.test(username) },
    { label: "يبدأ بحرف", met: /^[a-zA-Z]/.test(username) },
  ]
  const allUsernameRequirementsMet = usernameRequirements.every((r) => r.met)

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

  const checkUsernameAvailability = useDebouncedCallback(async (uname: string) => {
    if (!allUsernameRequirementsMet) {
      setUsernameAvailable(null)
      return
    }

    setIsCheckingUsername(true)
    try {
      const { data, error } = await supabase.from("profiles").select("id").ilike("username", uname.trim()).limit(1)

      if (error) {
        setUsernameAvailable(null)
      } else {
        setUsernameAvailable(data.length === 0)
      }
    } catch {
      setUsernameAvailable(null)
    } finally {
      setIsCheckingUsername(false)
    }
  }, 500)

  useEffect(() => {
    if (displayName.trim().length >= 2) {
      checkNameAvailability(displayName)
    } else {
      setNameAvailable(null)
    }
  }, [displayName, checkNameAvailability])

  useEffect(() => {
    if (username.trim().length >= 3) {
      checkUsernameAvailability(username)
    } else {
      setUsernameAvailable(null)
    }
  }, [username, checkUsernameAvailability])

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

    if (!allUsernameRequirementsMet || usernameAvailable === false) {
      setError("المعرف غير صالح أو مستخدم بالفعل")
      setIsLoading(false)
      return
    }

    if (!termsAccepted || !privacyAccepted) {
      setError("يجب الموافقة على الشروط وسياسة الخصوصية")
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/confirm`,
          data: {
            display_name: displayName.trim(),
            username: username.trim().toLowerCase(),
          },
        },
      })
      if (error) throw error

      if (data.user) {
        await fetch("/api/legal/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.user.id,
            termsAccepted,
            privacyAccepted,
          }),
        })
      }

      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "حدث خطأ")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    const supabase = createClient()
    setIsGoogleLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/auth/callback?next=/auth/complete-profile`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })
      if (error) throw error
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "حدث خطأ في التسجيل بجوجل")
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3 mb-4">
            <Image
              src="/icons/app-logo.jpg"
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
            <Button
              type="button"
              variant="outline"
              className="w-full mb-6 h-12 text-base bg-transparent"
              onClick={handleGoogleSignUp}
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  جاري الاتصال...
                </>
              ) : (
                <>
                  <GoogleIcon className="w-5 h-5 ml-2" />
                  التسجيل مع جوجل
                </>
              )}
            </Button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">أو التسجيل بالبريد</span>
              </div>
            </div>

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
                  <Label htmlFor="username">المعرف (Username)</Label>
                  <div className="relative">
                    <AtSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="username"
                      required
                      minLength={3}
                      maxLength={20}
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      className="bg-background pr-10 pl-10"
                      dir="ltr"
                    />
                    {username.length >= 3 && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {isCheckingUsername ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : usernameAvailable === true && allUsernameRequirementsMet ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">يمكن للآخرين العثور عليك بـ @{username || "username"}</p>
                  {username.length > 0 && !allUsernameRequirementsMet && (
                    <div className="mt-1 p-2 rounded-lg bg-secondary/50 space-y-1">
                      {usernameRequirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {req.met ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-muted-foreground" />
                          )}
                          <span className={req.met ? "text-green-500" : "text-muted-foreground"}>{req.label}</span>
                        </div>
                      ))}
                    </div>
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
                <LegalConsentCheckbox
                  termsAccepted={termsAccepted}
                  privacyAccepted={privacyAccepted}
                  onTermsChange={setTermsAccepted}
                  onPrivacyChange={setPrivacyAccepted}
                />
                {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isLoading ||
                    isGoogleLoading ||
                    !allRequirementsMet ||
                    !passwordsMatch ||
                    nameAvailable === false ||
                    isCheckingName ||
                    !allUsernameRequirementsMet ||
                    usernameAvailable === false ||
                    isCheckingUsername ||
                    !termsAccepted ||
                    !privacyAccepted
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
