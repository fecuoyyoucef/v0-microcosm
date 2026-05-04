"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Bell, Volume2, Smartphone, Loader2, CheckCircle2, XCircle, Moon, Clock, BellOff } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_PREFERENCES,
  type NotificationPreferences,
  type NotificationPreset,
} from "@/lib/notifications/preferences"
import { toast } from "sonner"

type LoadedPrefs = NotificationPreferences | null

async function fetchPreferences(supabase: ReturnType<typeof createClient>): Promise<LoadedPrefs> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.error("[NotificationSettings] load error:", error)
    return null
  }
  if (data) return data as NotificationPreferences

  // Create row with defaults on first visit
  const insertPayload: NotificationPreferences = {
    user_id: user.id,
    ...DEFAULT_PREFERENCES,
    timezone:
      (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
      DEFAULT_PREFERENCES.timezone,
  }

  const { data: inserted } = await supabase
    .from("notification_preferences")
    .insert(insertPayload)
    .select()
    .single()

  return (inserted as NotificationPreferences) ?? insertPayload
}

export default function NotificationsSettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { data: prefs, mutate, isLoading } = useSWR<LoadedPrefs>("notification-preferences", () =>
    fetchPreferences(supabase),
  )

  const [saving, setSaving] = useState(false)
  const [pushStatus, setPushStatus] = useState<NotificationPermission>("default")
  const [isPushEnabled, setIsPushEnabled] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if ("Notification" in window) {
      setPushStatus(Notification.permission)
      setIsPushEnabled(Notification.permission === "granted")
    }
  }, [])

  const updatePref = async <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => {
    if (!prefs) return
    const next = { ...prefs, [key]: value }
    // Optimistic update
    mutate(next, { revalidate: false })
    setSaving(true)
    const { error } = await supabase
      .from("notification_preferences")
      .update({ [key]: value })
      .eq("user_id", prefs.user_id)
    setSaving(false)
    if (error) {
      console.error("[NotificationSettings] save error:", error)
      toast.error("تعذر حفظ التغيير")
      mutate(prefs, { revalidate: true })
    }
  }

  const handleEnablePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("المتصفح لا يدعم الإشعارات الفورية")
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
          toast.success("تم تفعيل الإشعارات الفورية بنجاح")
        } else {
          throw new Error("فشل حفظ الاشتراك")
        }
      } else if (permission === "denied") {
        toast.error("تم رفض الإذن. فعّل الإشعارات من إعدادات المتصفح.")
      }
    } catch (error) {
      console.error("Push registration error:", error)
      toast.error("حدث خطأ في تفعيل الإشعارات الفورية")
    } finally {
      setIsRegistering(false)
    }
  }

  const handleTestNotification = async () => {
    if (!isPushEnabled) {
      toast.error("يجب تفعيل الإشعارات الفورية أولاً")
      return
    }
    try {
      const response = await fetch("/api/push/test", { method: "POST" })
      if (response.ok) toast.success("تم إرسال إشعار تجريبي")
      else toast.error("فشل إرسال الإشعار التجريبي")
    } catch {
      toast.error("فشل إرسال الإشعار التجريبي")
    }
  }

  const setDndMinutes = (minutes: number | null) => {
    const value = minutes ? new Date(Date.now() + minutes * 60_000).toISOString() : null
    updatePref("dnd_until", value)
  }

  if (isLoading || !prefs) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const dndActive = prefs.dnd_until && new Date(prefs.dnd_until) > new Date()

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            الإشعارات
          </h1>
          <p className="text-muted-foreground mt-1">إدارة إعدادات الإشعارات والصوتيات</p>
        </div>
        {saving && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            جاري الحفظ
          </div>
        )}
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
                <p className="text-xs text-muted-foreground">الزر الرئيسي لجميع الإشعارات</p>
              </div>
            </div>
            <Switch
              checked={prefs.global_enabled}
              onCheckedChange={(v) => updatePref("global_enabled", v)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-preset" className="font-semibold">
              نمط الإشعارات
            </Label>
            <Select
              value={prefs.preset}
              onValueChange={(v) => updatePref("preset", v as NotificationPreset)}
              disabled={!prefs.global_enabled}
            >
              <SelectTrigger id="notif-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الإشعارات</SelectItem>
                <SelectItem value="important">المهمة فقط (إشارات + قرارات)</SelectItem>
                <SelectItem value="groups">تنبيهات المجموعات</SelectItem>
                <SelectItem value="mentions">الإشارات فقط</SelectItem>
                <SelectItem value="none">بدون إشعارات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BellOff className="w-5 h-5 text-muted-foreground" />
            عدم الإزعاج
          </CardTitle>
          <CardDescription>إيقاف مؤقت لجميع الإشعارات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dndActive && (
            <Alert>
              <AlertDescription className="flex items-center justify-between gap-2">
                <span>
                  وضع عدم الإزعاج مفعّل حتى{" "}
                  <strong>{new Date(prefs.dnd_until!).toLocaleTimeString("ar")}</strong>
                </span>
                <Button size="sm" variant="outline" onClick={() => setDndMinutes(null)}>
                  إلغاء
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setDndMinutes(30)}>
              30 دقيقة
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDndMinutes(60)}>
              ساعة
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDndMinutes(60 * 4)}>
              4 ساعات
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDndMinutes(60 * 24)}>
              يوم كامل
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Moon className="w-5 h-5 text-muted-foreground" />
            ساعات الهدوء
          </CardTitle>
          <CardDescription>تعطيل تلقائي للإشعارات الفورية ضمن ساعات محددة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-semibold cursor-pointer">تفعيل ساعات الهدوء</Label>
            <Switch
              checked={prefs.quiet_hours_enabled}
              onCheckedChange={(v) => updatePref("quiet_hours_enabled", v)}
            />
          </div>
          {prefs.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="qh-start" className="text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" /> من
                </Label>
                <Input
                  id="qh-start"
                  type="time"
                  value={prefs.quiet_hours_start ?? "22:00"}
                  onChange={(e) => updatePref("quiet_hours_start", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="qh-end" className="text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" /> إلى
                </Label>
                <Input
                  id="qh-end"
                  type="time"
                  value={prefs.quiet_hours_end ?? "07:00"}
                  onChange={(e) => updatePref("quiet_hours_end", e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">قنوات الإشعارات</CardTitle>
          <CardDescription>تحكم في كل نوع من الإشعارات على حدة</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/50">
          <ChannelRow
            label="الإشارات (@)"
            description="عند ذكرك في رسالة"
            inApp={prefs.channel_mention}
            push={prefs.push_mention}
            onInApp={(v) => updatePref("channel_mention", v)}
            onPush={(v) => updatePref("push_mention", v)}
          />
          <ChannelRow
            label="الرسائل الجديدة"
            description="رسائل في خلاياك"
            inApp={prefs.channel_message}
            push={prefs.push_message}
            onInApp={(v) => updatePref("channel_message", v)}
            onPush={(v) => updatePref("push_message", v)}
          />
          <ChannelRow
            label="التفاعلات"
            description="ردود الفعل على رسائلك"
            inApp={prefs.channel_reaction}
            push={prefs.push_reaction}
            onInApp={(v) => updatePref("channel_reaction", v)}
            onPush={(v) => updatePref("push_reaction", v)}
          />
          <ChannelRow
            label="القرارات"
            description="قرارات جديدة أو نتائج تصويت"
            inApp={prefs.channel_decision}
            push={prefs.push_decision}
            onInApp={(v) => updatePref("channel_decision", v)}
            onPush={(v) => updatePref("push_decision", v)}
          />
          <ChannelRow
            label="إشعارات النظام"
            description="إعلانات وتحديثات"
            inApp={prefs.channel_system}
            push={prefs.push_system}
            onInApp={(v) => updatePref("channel_system", v)}
            onPush={(v) => updatePref("push_system", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الصوت وسطح المكتب</CardTitle>
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
            <Switch
              checked={prefs.sound_enabled}
              onCheckedChange={(v) => updatePref("sound_enabled", v)}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label className="font-semibold cursor-pointer">إشعارات سطح المكتب</Label>
                <p className="text-xs text-muted-foreground">إظهار إشعارات حتى عند عدم استخدام التطبيق</p>
              </div>
            </div>
            <Switch
              checked={prefs.desktop_enabled}
              onCheckedChange={(v) => updatePref("desktop_enabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            الإشعارات الفورية (Push)
          </CardTitle>
          <CardDescription>استقبل إشعارات حتى عند إغلاق التطبيق</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <div className="flex items-center gap-2">
                {isPushEnabled ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
                <AlertDescription>
                  {isPushEnabled ? (
                    <span className="font-medium">الإشعارات الفورية مفعّلة</span>
                  ) : pushStatus === "denied" ? (
                    <span className="text-destructive">
                      تم رفض الإذن. افتح إعدادات المتصفح لتفعيلها
                    </span>
                  ) : (
                    <span className="text-muted-foreground">انقر أدناه لتفعيل الإشعارات الفورية</span>
                  )}
                </AlertDescription>
              </div>
            </Alert>

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
    </div>
  )
}

function ChannelRow({
  label,
  description,
  inApp,
  push,
  onInApp,
  onPush,
}: {
  label: string
  description: string
  inApp: boolean
  push: boolean
  onInApp: (v: boolean) => void
  onPush: (v: boolean) => void
}) {
  return (
    <div className="py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex-1 min-w-[200px]">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">داخلي</span>
          <Switch checked={inApp} onCheckedChange={onInApp} />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Push</span>
          <Switch checked={push} onCheckedChange={onPush} disabled={!inApp} />
        </label>
      </div>
    </div>
  )
}
