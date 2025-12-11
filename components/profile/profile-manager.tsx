"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { User, Mail, Lock, Trash2, Loader2, Check, ArrowRight, X } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Profile } from "@/lib/types"
import Link from "next/link"

interface ProfileManagerProps {
  user: SupabaseUser
  profile: Profile | null
}

export function ProfileManager({ user, profile }: ProfileManagerProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name || "")
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [isDeleting, setIsDeleting] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const passwordRequirements = [
    { label: "6 أحرف على الأقل", met: newPassword.length >= 6 },
    { label: "حرف كبير واحد على الأقل", met: /[A-Z]/.test(newPassword) },
    { label: "رقم واحد على الأقل", met: /[0-9]/.test(newPassword) },
  ]

  const allRequirementsMet = passwordRequirements.every((r) => r.met)
  const passwordsMatch = newPassword === repeatPassword && repeatPassword.length > 0

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true)
    setProfileSuccess(false)

    try {
      const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id)

      if (error) throw error
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleUpdatePassword = async () => {
    setIsUpdatingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword !== repeatPassword) {
      setPasswordError("كلمات المرور غير متطابقة")
      setIsUpdatingPassword(false)
      return
    }

    if (!allRequirementsMet) {
      setPasswordError("كلمة المرور لا تستوفي جميع المتطلبات")
      setIsUpdatingPassword(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPasswordSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setRepeatPassword("")
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (error: unknown) {
      setPasswordError(error instanceof Error ? error.message : "حدث خطأ")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      // حذف الحساب - هذا يتطلب دالة Edge أو RPC في الإنتاج
      await supabase.auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Error deleting account:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/chat">
          <Button variant="ghost" size="icon">
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">إدارة الحساب</h1>
          <p className="text-muted-foreground">تحديث معلومات حسابك وإعداداتك</p>
        </div>
      </div>

      {/* معلومات الملف الشخصي */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle>الملف الشخصي</CardTitle>
          </div>
          <CardDescription>قم بتحديث معلومات ملفك الشخصي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">اسم العرض</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="اسمك كما سيظهر للآخرين"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm" dir="ltr">
                {user.email}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">البريد الإلكتروني غير قابل للتغيير</p>
          </div>
          <Button
            onClick={handleUpdateProfile}
            disabled={isUpdatingProfile || !displayName.trim()}
            className="w-full sm:w-auto"
          >
            {isUpdatingProfile ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                جاري الحفظ...
              </>
            ) : profileSuccess ? (
              <>
                <Check className="w-4 h-4 ml-2" />
                تم الحفظ
              </>
            ) : (
              "حفظ التغييرات"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* تغيير كلمة المرور */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <CardTitle>كلمة المرور</CardTitle>
          </div>
          <CardDescription>تغيير كلمة مرور حسابك</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-background"
              dir="ltr"
            />
            {newPassword.length > 0 && (
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
          <div className="space-y-2">
            <Label htmlFor="repeatPassword">تأكيد كلمة المرور</Label>
            <Input
              id="repeatPassword"
              type="password"
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
          {passwordError && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-green-500 bg-green-500/10 p-3 rounded-lg">تم تحديث كلمة المرور بنجاح</p>
          )}
          <Button
            onClick={handleUpdatePassword}
            disabled={isUpdatingPassword || !allRequirementsMet || !passwordsMatch}
            className="w-full sm:w-auto"
          >
            {isUpdatingPassword ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                جاري التحديث...
              </>
            ) : (
              "تحديث كلمة المرور"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* حذف الحساب */}
      <Card className="border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            <CardTitle className="text-destructive">منطقة الخطر</CardTitle>
          </div>
          <CardDescription>إجراءات لا يمكن التراجع عنها</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="w-4 h-4" />
                حذف الحساب نهائياً
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف حسابك وجميع بياناتك بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري الحذف...
                    </>
                  ) : (
                    "نعم، احذف حسابي"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
