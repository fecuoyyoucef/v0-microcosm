"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Loader2, Check, X, AtSign } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"
import Image from "next/image"

export default function CompleteProfilePage() {
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const usernameRequirements = [
    { label: "3-20 حرف", met: username.length >= 3 && username.length <= 20 },
    { label: "أحرف إنجليزية وأرقام و _ فقط", met: /^[a-zA-Z0-9_]*$/.test(username) },
    { label: "يبدأ بحرف", met: /^[a-zA-Z]/.test(username) },
  ]
  const allUsernameRequirementsMet = usernameRequirements.every((r) => r.met)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .eq("id", user.id)
        .single()

      if (profile?.username) {
        router.push("/auth/survey")
        return
      }

      const googleName = user.user_metadata?.full_name || user.user_metadata?.name
      if (googleName) {
        setDisplayName(googleName)
      }

      setUser({ id: user.id, email: user.email })
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [supabase, router])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    setError(null)

    if (displayName.trim().length < 2) {
      setError("اسم العرض يجب أن يكون حرفين على الأقل")
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

    try {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: displayName.trim(),
        username: username.trim().toLowerCase(),
        updated_at: new Date().toISOString(),
      })

      if (profileError) throw profileError

      router.push("/auth/survey")
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "حدث خطأ")
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3 mb-4">
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
          </div>
          <p className="text-muted-foreground">أكمل معلومات حسابك</p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>إكمال الملف الشخصي</CardTitle>
            <CardDescription>
              مرحباً! أنت تسجل بـ {user?.email}
              <br />
              أكمل معلوماتك للمتابعة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
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

                {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isLoading ||
                    displayName.trim().length < 2 ||
                    nameAvailable === false ||
                    isCheckingName ||
                    !allUsernameRequirementsMet ||
                    usernameAvailable === false ||
                    isCheckingUsername
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري الحفظ...
                    </>
                  ) : (
                    "المتابعة"
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
