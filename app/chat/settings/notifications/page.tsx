"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Bell, Volume2, Smartphone } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function NotificationsSettingsPage() {
  const [enableNotifications, setEnableNotifications] = useState(true)
  const [enableSounds, setEnableSounds] = useState(true)
  const [enableDesktopNotifications, setEnableDesktopNotifications] = useState(false)
  const [notificationPreset, setNotificationPreset] = useState("all")
  const [isPushEnabled, setIsPushEnabled] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [pushStatus, setPushStatus] = useState<"granted" | "denied" | "default">("default")

  useEffect(() => {
    if ("Notification" in window && "serviceWorker" in navigator) {
      setPushStatus(Notification.permission)
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
      setPushStatus(permission)

      if (permission === "granted") {
        const registration = await navigator.serviceWorker.ready

        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidPublicKey,
          })
        }

        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        })

        if (response.ok) {
          setIsPushEnabled(true)
          alert("تم تفعيل الإشعارات الفورية بنجاح!")
        } else {
          throw new Error("فشل حفظ الاشتراك")
        }
      } else if (permission === "denied") {
        alert("تم رفض الإذن. يمكنك تفعيل الإشعارات من إعدادات المتصفح.")
      }
    } catch (error) {
      console.error("Push notification registration error:", error)
      alert("حدث خطأ في تفعيل الإشعارات الفورية")
    } finally {
      setIsRegistering(false)
    }
  }

  const handleTestNotification = async () => {
    if (!isPushEnabled) {
      alert("يجب تفعيل الإشعارات الفورية أولاً")
      return
    }

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        alert("تم إرسال إشعار تجريبي!")
      }
    } catch (error) {
      alert("فشل إرسال الإشعار التجريبي")
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          الإشعارات
        </h1>
        <p className="text-muted-foreground mt-1">إدارة إعدادات الإشعارات والصوتيات</p>
      </div>

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
            <Smartphone className="w-5 h-5 text-primary" />
            الإشعارات الفورية (Push Notifications)
          </CardTitle>
          <CardDescription>استقبل إشعارات حتى عند إغلاق التطبيق - مثالي للتطبيق المغلف (APK)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert className={isPushEnabled ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}>
              <div className="flex items-center gap-2">
                {isPushEnabled ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
                <AlertDescription>
                  {isPushEnabled ? (
                    <span className="text-green-700 dark:text-green-400 font-medium">
                      الإشعارات الفورية مفعّلة وتعمل بشكل كامل
                    </span>
                  ) : pushStatus === "denied" ? (
                    <span className="text-destructive">
                      تم رفض إذن الإشعارات. افتح إعدادات المتصفح/التطبيق لتفعيلها
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      الإشعارات الفورية غير مفعّلة - انقر على الزر أدناه للتفعيل
                    </span>
                  )}
                </AlertDescription>
              </div>
            </Alert>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">المميزات:</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>✓ إشعارات فورية عند وصول رسائل جديدة</li>
                <li>✓ تعمل حتى عند إغلاق التطبيق</li>
                <li>✓ دعم كامل للتطبيقات المغلفة (APK)</li>
                <li>✓ رد سريع من الإشعار مباشرة</li>
                <li>✓ عداد للرسائل غير المقروءة</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleEnablePush}
                disabled={isPushEnabled || isRegistering || pushStatus === "denied"}
                className="flex-1"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري التفعيل...
                  </>
                ) : isPushEnabled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    مفعّلة
                  </>
                ) : (
                  "تفعيل الإشعارات"
                )}
              </Button>

              {isPushEnabled && (
                <Button onClick={handleTestNotification} variant="outline">
                  <Bell className="w-4 h-4 ml-2" />
                  إرسال تجريبي
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

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
