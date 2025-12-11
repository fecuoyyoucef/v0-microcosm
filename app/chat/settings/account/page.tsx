"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Check, Loader2, Camera, Download, Activity, Monitor, Info, X, Shield } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Profile } from "@/lib/types"
import Link from "next/link"
import { useDebouncedCallback } from "use-debounce"

export default function AccountSettingsPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [originalDisplayName, setOriginalDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()
  const router = useRouter()

  const checkNameAvailability = useDebouncedCallback(async (name: string) => {
    if (name.trim().length < 2 || name.trim() === originalDisplayName) {
      setNameAvailable(null)
      return
    }

    setIsCheckingName(true)
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .ilike("display_name", name.trim())
        .neq("id", user?.id || "")
        .limit(1)

      if (error) {
        setNameAvailable(null)
      } else {
        setNameAvailable(data.length === 0)
      }
    } catch (err) {
      setNameAvailable(null)
    } finally {
      setIsCheckingName(false)
    }
  }, 500)

  useEffect(() => {
    if (displayName.trim().length >= 2 && displayName.trim() !== originalDisplayName) {
      checkNameAvailability(displayName)
    } else {
      setNameAvailable(null)
    }
  }, [displayName, originalDisplayName, checkNameAvailability])

  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()
        if (!authUser) {
          router.push("/auth/login")
          return
        }

        setUser(authUser)

        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()

        if (profileData) {
          setProfile(profileData)
          setDisplayName(profileData.display_name || "")
          setOriginalDisplayName(profileData.display_name || "")
          setBio(profileData.bio || "")
          setAvatarUrl(profileData.avatar_url || null)
        }

        const { data: adminData } = await supabase
          .from("admins")
          .select("id, is_active")
          .eq("email", authUser.email)
          .eq("is_active", true)
          .single()

        setIsAdmin(!!adminData)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [supabase, router])

  const handleSaveProfile = async () => {
    if (!user) return

    if (displayName.trim() !== originalDisplayName && nameAvailable === false) {
      alert("اسم العرض مستخدم بالفعل، يرجى اختيار اسم آخر")
      return
    }

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio || null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id)

      if (error) throw error
      setOriginalDisplayName(displayName.trim())
      setNameAvailable(null)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving profile:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsUploadingAvatar(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
    } catch (error) {
      console.error("Error uploading avatar:", error)
      alert("حدث خطأ في رفع الصورة")
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleExportData = async () => {
    if (!user) return

    try {
      const { data: messages } = await supabase.from("messages").select("*").eq("sender_id", user.id)

      const { data: groups } = await supabase.from("group_members").select("groups(*)").eq("user_id", user.id)

      const exportData = {
        profile: { ...profile, email: user.email },
        messages: messages || [],
        groups: groups?.map((g) => g.groups) || [],
        exportedAt: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `microcosm-data-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting data:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <User className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          الحساب الشخصي
        </h1>
        <p className="text-sm text-muted-foreground mt-1">إدارة معلومات حسابك الشخصية</p>
      </div>

      {isAdmin && (
        <Card className="border-cyan-500/50 bg-cyan-500/5">
          <CardContent className="p-4">
            <Link href="/admin" className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-semibold text-cyan-400">لوحة تحكم المالك</p>
                  <p className="text-xs text-muted-foreground">إدارة التطبيق والمستخدمين</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
              >
                فتح
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الصورة الشخصية</CardTitle>
          <CardDescription>صورتك كما تظهر للآخرين في المجموعات</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="w-20 h-20 md:w-24 md:h-24">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                {displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">تغيير الصورة</p>
            <p className="text-xs text-muted-foreground">اضغط على أيقونة الكاميرا لرفع صورة جديدة</p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">معلومات الحساب</CardTitle>
          <CardDescription>معلوماتك الأساسية على المنصة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="font-semibold">
              اسم العرض
            </Label>
            <div className="relative">
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="أدخل اسم العرض الخاص بك"
                className="bg-background pl-10"
                minLength={2}
                maxLength={30}
              />
              {displayName.length >= 2 && displayName.trim() !== originalDisplayName && (
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
            {displayName.length >= 2 && displayName.trim() !== originalDisplayName && nameAvailable !== null && (
              <p className={`text-xs ${nameAvailable ? "text-green-500" : "text-destructive"}`}>
                {nameAvailable ? "هذا الاسم متاح" : "هذا الاسم مستخدم بالفعل"}
              </p>
            )}
            <p className="text-xs text-muted-foreground">هذا هو الاسم الذي سيراه الآخرون في المحادثات والمجموعات</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="font-semibold">
              نبذة عنك
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتب نبذة قصيرة عن نفسك..."
              className="bg-background resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{bio.length}/200 حرف - تظهر في ملفك الشخصي للآخرين</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="font-semibold">البريد الإلكتروني</Label>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border">
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-mono" dir="ltr">
                {user?.email}
              </span>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">لماذا لا يمكن تغيير البريد الإلكتروني؟</p>
                <p>
                  البريد الإلكتروني مرتبط بحسابك للتحقق من الهوية والأمان. إذا كنت بحاجة لتغييره، تواصل مع فريق الدعم
                  وسنساعدك في العملية.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSaveProfile}
              disabled={
                isSaving ||
                !displayName.trim() ||
                (displayName.trim() !== originalDisplayName && nameAvailable === false) ||
                isCheckingName
              }
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  تم الحفظ
                </>
              ) : (
                "حفظ التغييرات"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">حالة الحساب</CardTitle>
          <CardDescription>معلومات عن حسابك</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-sm text-muted-foreground">حالة التحقق</span>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-green-500">تم التحقق</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-sm text-muted-foreground">تاريخ إنشاء الحساب</span>
            <span className="text-sm font-mono">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString("ar-EG") : "-"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">البيانات والخصوصية</CardTitle>
          <CardDescription>إدارة بياناتك ونشاطك</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-3 bg-transparent" onClick={handleExportData}>
            <Download className="w-4 h-4" />
            تصدير بياناتك
          </Button>
          <Link href="/chat/settings/account/activity">
            <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
              <Activity className="w-4 h-4" />
              سجل النشاط
            </Button>
          </Link>
          <Link href="/chat/settings/account/sessions">
            <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
              <Monitor className="w-4 h-4" />
              الجلسات النشطة
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
