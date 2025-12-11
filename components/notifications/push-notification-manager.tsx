"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, BellOff, Loader2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PushNotificationManagerProps {
  userId: string
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BDj8yhVUy0-Ued2Dw4joucx73R8-0HOjAcL5XeUGwxvp_KPrp1uBeFxvmGVXN2pvCnKtR_MG5pSPv0wx3f_OKzs"

const INSTALL_PROMPT_KEY = "synaptic_install_prompt"
const INSTALL_PROMPT_INTERVAL = 3 * 24 * 60 * 60 * 1000 // 3 days

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">("default")
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallDialog, setShowInstallDialog] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const isInStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    setIsStandalone(isInStandaloneMode)
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Check if we should show install dialog
      checkAndShowInstallPrompt()
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const checkAndShowInstallPrompt = useCallback(() => {
    if (isStandalone) return

    const lastDismissed = localStorage.getItem(INSTALL_PROMPT_KEY)
    if (lastDismissed) {
      const timeSinceDismissed = Date.now() - Number.parseInt(lastDismissed, 10)
      if (timeSinceDismissed < INSTALL_PROMPT_INTERVAL) {
        return
      }
    }

    // Show prompt after a short delay
    setTimeout(() => {
      setShowInstallDialog(true)
    }, 5000)
  }, [isStandalone])

  useEffect(() => {
    if (!isStandalone && !deferredPrompt) {
      checkAndShowInstallPrompt()
    }
  }, [isStandalone, deferredPrompt, checkAndShowInstallPrompt])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setDeferredPrompt(null)
        setShowInstallDialog(false)
      }
    } else {
      // Show manual instructions
      setShowInstallDialog(true)
    }
  }

  const handleDismissInstall = () => {
    localStorage.setItem(INSTALL_PROMPT_KEY, Date.now().toString())
    setShowInstallDialog(false)
  }

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermissionStatus("unsupported")
      return
    }
    setPermissionStatus(Notification.permission)
    checkExistingSubscription()
  }, [])

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error("Error checking subscription:", error)
    }
  }

  const subscribeToPush = async () => {
    setIsSubscribing(true)

    try {
      const permission = await Notification.requestPermission()
      setPermissionStatus(permission)

      if (permission !== "granted") {
        setIsSubscribing(false)
        return
      }

      const registration = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const subscriptionJson = subscription.toJSON()

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )

      if (error) {
        console.error("Error saving subscription:", error)
        throw error
      }

      setIsSubscribed(true)

      new Notification("Synaptic Space", {
        body: "تم تفعيل الإشعارات بنجاح! ستصلك الإشعارات حتى وأنت خارج التطبيق.",
        icon: "/icons/icon-192x192.png",
      })
    } catch (error) {
      console.error("Error subscribing to push:", error)
    } finally {
      setIsSubscribing(false)
    }
  }

  // Listen for new notifications via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notif = payload.new as {
            id: string
            title: string
            body: string
            type: string
            data?: { action_url?: string }
          }

          if (Notification.permission === "granted" && document.visibilityState === "visible") {
            const browserNotif = new Notification(notif.title || "Synaptic Space", {
              body: notif.body || "لديك إشعار جديد",
              icon: "/icons/icon-192x192.png",
              tag: `notif-${notif.id}`,
            })

            browserNotif.onclick = () => {
              window.focus()
              browserNotif.close()
            }
          }

          if ("setAppBadge" in navigator) {
            ;(navigator as Navigator & { setAppBadge: (count: number) => void }).setAppBadge(1)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  if (permissionStatus === "unsupported") {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {!isStandalone && (
          <Button variant="ghost" size="sm" onClick={handleInstall} className="gap-2 text-xs text-muted-foreground">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">تثبيت التطبيق</span>
          </Button>
        )}

        {isSubscribed && permissionStatus === "granted" ? (
          <div className="flex items-center gap-1 text-xs text-green-500">
            <Bell className="h-3 w-3" />
            <span className="hidden sm:inline">الإشعارات مفعلة</span>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={subscribeToPush}
            disabled={isSubscribing}
            className="gap-2 text-xs text-muted-foreground"
          >
            {isSubscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
            <span className="hidden sm:inline">{isSubscribing ? "جاري التفعيل..." : "تفعيل الإشعارات"}</span>
          </Button>
        )}
      </div>

      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              ثبّت التطبيق للحصول على تجربة أفضل
            </DialogTitle>
            <DialogDescription className="text-right">
              احصل على إشعارات فورية حتى وأنت خارج المتصفح، ووصول سريع من شاشتك الرئيسية.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 space-y-3">
              <p className="text-sm font-medium">مميزات التطبيق:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  إشعارات فورية للرسائل الجديدة
                </li>
                <li className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  وصول سريع من الشاشة الرئيسية
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  تجربة أسرع وأكثر سلاسة
                </li>
              </ul>
            </div>

            {!deferredPrompt && (
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">كيفية التثبيت:</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <strong>Chrome/Edge:</strong> اضغط على أيقونة القائمة (⋮) ← "تثبيت التطبيق"
                  </p>
                  <p>
                    <strong>Safari (iOS):</strong> اضغط على أيقونة المشاركة (↑) ← "إضافة إلى الشاشة الرئيسية"
                  </p>
                  <p>
                    <strong>Firefox:</strong> اضغط على أيقونة القائمة (≡) ← "تثبيت"
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="ghost" onClick={handleDismissInstall}>
              لاحقاً
            </Button>
            {deferredPrompt && (
              <Button onClick={handleInstall}>
                <Download className="h-4 w-4 ml-2" />
                تثبيت الآن
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
