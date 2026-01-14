"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Lock, Eye, MessageSquare, AlertCircle } from "lucide-react"
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

export default function PrivacySettingsPage() {
  const [isPrivateAccount, setIsPrivateAccount] = useState(false)
  const [allowGroupInvites, setAllowGroupInvites] = useState(true)
  const [showOnlineStatus, setShowOnlineStatus] = useState(true)
  const [allowReadReceipts, setAllowReadReceipts] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch("/api/user/delete-account", {
        method: "DELETE",
      })

      if (response.ok) {
        window.location.href = "/"
      } else {
        alert("حدث خطأ أثناء حذف الحساب")
      }
    } catch (error) {
      console.error("Error deleting account:", error)
      alert("حدث خطأ أثناء حذف الحساب")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lock className="w-6 h-6 text-primary" />
          الخصوصية والأمان
        </h1>
        <p className="text-muted-foreground mt-1">تحكم في من يمكنه الوصول إلى معلوماتك</p>
      </div>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إعدادات الخصوصية</CardTitle>
          <CardDescription>تحكم من يرى معلومات الملف الشخصي الخاص بك</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Private Account */}
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition">
            <div className="flex items-center gap-3 flex-1">
              <Eye className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label className="font-semibold cursor-pointer">حساب خاص</Label>
                <p className="text-xs text-muted-foreground">فقط الأشخاص الذين وافقت عليهم يمكنهم رؤية ملفك الشخصي</p>
              </div>
            </div>
            <Switch checked={isPrivateAccount} onCheckedChange={setIsPrivateAccount} />
          </div>

          {/* Group Invites */}
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition">
            <div className="flex items-center gap-3 flex-1">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label className="font-semibold cursor-pointer">دعوات المجموعات</Label>
                <p className="text-xs text-muted-foreground">السماح لأي شخص بدعوتك للمجموعات</p>
              </div>
            </div>
            <Switch checked={allowGroupInvites} onCheckedChange={setAllowGroupInvites} />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Online Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">حالة النشاط</CardTitle>
          <CardDescription>تحكم من يرى متى تكون نشطاً</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Online Status */}
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <Label className="font-semibold cursor-pointer">عرض حالة النشاط</Label>
                <p className="text-xs text-muted-foreground">أظهر حالة نشاطك للآخرين في المحادثات</p>
              </div>
            </div>
            <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
          </div>

          {/* Read Receipts */}
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div>
                <Label className="font-semibold cursor-pointer">تأكيد المقروء</Label>
                <p className="text-xs text-muted-foreground">دع الآخرين يعرفون متى قرأت رسائلهم</p>
              </div>
            </div>
            <Switch checked={allowReadReceipts} onCheckedChange={setAllowReadReceipts} />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-lg text-destructive flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            منطقة الخطر
          </CardTitle>
          <CardDescription>إجراءات حساسة لا يمكن التراجع عنها</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 bg-transparent"
                disabled={isDeleting}
              >
                {isDeleting ? "جاري الحذف..." : "حذف الحساب نهائياً"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد من حذف حسابك؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف حسابك وجميع بياناتك بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground"
                >
                  {isDeleting ? "جاري الحذف..." : "حذف نهائي"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
