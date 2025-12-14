"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Bell, Volume2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function NotificationsSettingsPage() {
  const [enableNotifications, setEnableNotifications] = useState(true)
  const [enableSounds, setEnableSounds] = useState(true)
  const [enableDesktopNotifications, setEnableDesktopNotifications] = useState(false)
  const [notificationPreset, setNotificationPreset] = useState("all")
  const [isPushEnabled, setIsPushEnabled] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  useEffect(() => {
    // Check if push notifications are supported and permission status
    if ("Notification" in window && "serviceWorker" in navigator) {
      setIsPushEnabled(Notification.permission === "granted")
    }
  }, [])

  const handleEnablePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      alert("المتصفح لا يدعم الإشعارات الفورية")
      return
    }

    setIsRegistering(true)
    try {
      const permission = await Notification.requestPermission()

      if (permission === "granted") {
        // Register service worker and subscribe
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })

        // Send subscription to server
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        })

        setIsPushEnabled(true)
        alert("تم تفعيل الإشعارات الفورية بنجاح!")
      } else {
        alert("يجب السماح بالإشعارات لتفعيل هذه الميزة")
      }
    } catch (error) {
      console.error("Push notification registration error:", error)
      alert("حدث خطأ في تفعيل الإشعارات الفورية")
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          الإشعارات
        </h1>
        <p className="text-muted-foreground mt-1">إدارة إعدادات الإشعارات والصوتيات</p>
      </div>

      {/* General Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الإشعارات العامة</CardTitle>
          <CardDescription>تحكم في متى تتلقى الإشعارات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label className="font-semibold cursor-pointer">تفعيل الإشعارات</Label>
                <p className="text-xs text-muted-foreground">استقبل إشعارات عن الرسائل والأنشطة</p>
              </div>
            </div>
            <Switch checked={enableNotifications} onCheckedChange={setEnableNotifications} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-preset" className="font-semibold">
              نمط الإشعارات
            </Label>
            <Select value={notificationPreset} onValueChange={setNotificationPreset}>
              <SelectTrigger id="notif-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الإشعارات</SelectItem>
                <SelectItem value="important">الإشعارات المهمة فقط</SelectItem>
                <SelectItem value="groups">تنبيهات المجموعات</SelectItem>
                <SelectItem value="mentions">الإشارات فقط</SelectItem>
                <SelectItem value="none">بدون إشعارات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Sound and Desktop Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الصوتيات والصور</CardTitle>
          <CardDescription>إعدادات إضافية للإشعارات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition">
            <div className="flex items-center gap-3 flex-1">
              <Volume2 className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label className="font-semibold cursor-pointer">أصوات الإشعارات</Label>
                <p className="text-xs text-muted-foreground">تشغيل صوت عند وصول رسالة جديدة</p>
              </div>
            </div>
            <Switch checked={enableSounds} onCheckedChange={setEnableSounds} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label className="font-semibold cursor-pointer">إشعارات سطح المكتب</Label>
                <p className="text-xs text-muted-foreground">إظهار إشعارات حتى عند عدم استخدام التطبيق</p>
              </div>
            </div>
            <Switch checked={enableDesktopNotifications} onCheckedChange={setEnableDesktopNotifications} />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            الإشعارات الفورية (Push Notifications)
          </CardTitle>
          <CardDescription>استقبل إشعارات حتى عند إغلاق التطبيق</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex-1">
                <p className="font-medium">{isPushEnabled ? "مفعّلة" : "غير مفعّلة"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isPushEnabled ? "ستصلك إشعارات فورية عند وصول رسائل جديدة" : "فعّل الإشعارات لتبقى على اطلاع دائم"}
                </p>
              </div>
              <Button onClick={handleEnablePush} disabled={isPushEnabled || isRegistering} size="sm">
                {isRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : isPushEnabled ? "مفعّلة" : "تفعيل"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Per-Group Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إشعارات محددة</CardTitle>
          <CardDescription>تخصيص الإشعارات لكل مجموعة</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            يمكنك تخصيص إعدادات الإشعارات لكل مجموعة على حدة من داخل المجموعة
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
