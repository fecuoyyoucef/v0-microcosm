"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

export default function TestPushPage() {
  const [status, setStatus] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Get current user
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
    })

    // Check initial status
    checkStatus()
  }, [])

  const checkStatus = () => {
    const newStatus: Record<string, any> = {}

    // 1. Check browser support
    newStatus.browserSupport = {
      notification: "Notification" in window,
      serviceWorker: "serviceWorker" in navigator,
      pushManager: "PushManager" in window,
    }

    // 2. Check notification permission
    newStatus.permission = Notification.permission

    // 3. Check environment variables
    newStatus.envVars = {
      apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }

    setStatus(newStatus)
  }

  const requestPermission = async () => {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      setStatus((prev) => ({ ...prev, permission }))

      if (permission === "granted") {
        // Try to register
        await registerForPush()
      }
    } catch (error) {
      console.error("Permission error:", error)
      setStatus((prev) => ({ ...prev, permissionError: String(error) }))
    }
    setLoading(false)
  }

  const registerForPush = async () => {
    setLoading(true)
    try {
      // Import and initialize Firebase
      const { initializeApp, getApps } = await import("firebase/app")
      const { getMessaging, getToken, isSupported } = await import("firebase/messaging")

      const supported = await isSupported()
      setStatus((prev) => ({ ...prev, firebaseSupported: supported }))

      if (!supported) {
        setStatus((prev) => ({ ...prev, error: "Firebase messaging not supported" }))
        return
      }

      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      }

      setStatus((prev) => ({ ...prev, firebaseConfig }))

      // Initialize Firebase
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
      setStatus((prev) => ({ ...prev, firebaseInitialized: true }))

      // Register service worker
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
      setStatus((prev) => ({ ...prev, serviceWorkerRegistered: true, swScope: registration.scope }))

      // Get messaging
      const messaging = getMessaging(app)
      setStatus((prev) => ({ ...prev, messagingInitialized: true }))

      // Get VAPID key from server
      const vapidResponse = await fetch("/api/firebase/vapid-key")
      const vapidData = await vapidResponse.json()
      setStatus((prev) => ({ ...prev, vapidKey: vapidData.vapidKey ? "Found" : "Missing" }))

      if (!vapidData.vapidKey) {
        setStatus((prev) => ({ ...prev, error: "VAPID key missing" }))
        return
      }

      // Get token
      const token = await getToken(messaging, {
        vapidKey: vapidData.vapidKey,
        serviceWorkerRegistration: registration,
      })

      setStatus((prev) => ({ ...prev, fcmToken: token ? token.substring(0, 50) + "..." : "Failed" }))

      if (token && userId) {
        // Save to database
        const supabase = createClient()
        const { error } = await supabase.from("fcm_tokens").upsert(
          {
            user_id: userId,
            token: token,
            device_info: { userAgent: navigator.userAgent },
            last_used_at: new Date().toISOString(),
          },
          { onConflict: "user_id,token" },
        )

        setStatus((prev) => ({
          ...prev,
          tokenSaved: error ? `Error: ${error.message}` : "Success",
        }))
      }
    } catch (error: any) {
      console.error("Registration error:", error)
      setStatus((prev) => ({ ...prev, error: error.message }))
    }
    setLoading(false)
  }

  const sendTestNotification = async () => {
    setLoading(true)
    try {
      console.log("[Test] Sending test notification...")
      const response = await fetch("/api/admin/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "اختبار الإشعارات",
          body: "هذا إشعار تجريبي من Firebase FCM!",
          targetType: "all",
        }),
      })

      const data = await response.json()
      console.log("[Test] Response:", data)
      setStatus((prev) => ({ ...prev, testSendResult: data }))
    } catch (error: any) {
      console.error("[Test] Error:", error)
      setStatus((prev) => ({ ...prev, testSendError: error.message }))
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>اختبار نظام الإشعارات</CardTitle>
          <CardDescription>صفحة تشخيص لفحص نظام Firebase Push Notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User ID */}
          <div className="flex items-center justify-between">
            <span>معرف المستخدم:</span>
            <Badge variant={userId ? "default" : "destructive"}>
              {userId ? userId.substring(0, 8) + "..." : "غير مسجل"}
            </Badge>
          </div>

          {/* Browser Support */}
          <div className="space-y-2">
            <h3 className="font-semibold">دعم المتصفح:</h3>
            <div className="flex gap-2 flex-wrap">
              <Badge variant={status.browserSupport?.notification ? "default" : "destructive"}>
                Notification: {status.browserSupport?.notification ? "نعم" : "لا"}
              </Badge>
              <Badge variant={status.browserSupport?.serviceWorker ? "default" : "destructive"}>
                Service Worker: {status.browserSupport?.serviceWorker ? "نعم" : "لا"}
              </Badge>
              <Badge variant={status.browserSupport?.pushManager ? "default" : "destructive"}>
                Push Manager: {status.browserSupport?.pushManager ? "نعم" : "لا"}
              </Badge>
            </div>
          </div>

          {/* Permission */}
          <div className="flex items-center justify-between">
            <span>إذن الإشعارات:</span>
            <Badge
              variant={
                status.permission === "granted"
                  ? "default"
                  : status.permission === "denied"
                    ? "destructive"
                    : "secondary"
              }
            >
              {status.permission === "granted" ? "مسموح" : status.permission === "denied" ? "مرفوض" : "لم يُطلب"}
            </Badge>
          </div>

          {/* Environment Variables */}
          <div className="space-y-2">
            <h3 className="font-semibold">متغيرات البيئة:</h3>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(status.envVars || {}).map(([key, value]) => (
                <Badge key={key} variant={value ? "default" : "destructive"}>
                  {key}: {value ? "موجود" : "مفقود"}
                </Badge>
              ))}
            </div>
          </div>

          {/* Other Status */}
          {status.firebaseSupported !== undefined && (
            <div className="flex items-center justify-between">
              <span>دعم Firebase:</span>
              <Badge variant={status.firebaseSupported ? "default" : "destructive"}>
                {status.firebaseSupported ? "مدعوم" : "غير مدعوم"}
              </Badge>
            </div>
          )}

          {status.serviceWorkerRegistered && (
            <div className="flex items-center justify-between">
              <span>Service Worker:</span>
              <Badge variant="default">مسجل</Badge>
            </div>
          )}

          {status.vapidKey && (
            <div className="flex items-center justify-between">
              <span>VAPID Key:</span>
              <Badge variant={status.vapidKey === "Found" ? "default" : "destructive"}>{status.vapidKey}</Badge>
            </div>
          )}

          {status.fcmToken && (
            <div className="flex items-center justify-between">
              <span>FCM Token:</span>
              <Badge variant="default" className="max-w-[200px] truncate">
                {status.fcmToken}
              </Badge>
            </div>
          )}

          {status.tokenSaved && (
            <div className="flex items-center justify-between">
              <span>حفظ Token:</span>
              <Badge variant={status.tokenSaved === "Success" ? "default" : "destructive"}>{status.tokenSaved}</Badge>
            </div>
          )}

          {status.error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md">
              <strong>خطأ:</strong> {status.error}
            </div>
          )}

          {status.testSendResult && (
            <div className="p-3 bg-muted rounded-md">
              <strong>نتيجة الإرسال:</strong>
              <pre className="text-xs mt-2">{JSON.stringify(status.testSendResult, null, 2)}</pre>
            </div>
          )}

          {status.testSendError && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md">
              <strong>خطأ في الإرسال:</strong> {status.testSendError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap pt-4">
            <Button onClick={checkStatus} variant="outline">
              تحديث الحالة
            </Button>

            {status.permission !== "granted" && (
              <Button onClick={requestPermission} disabled={loading}>
                طلب الإذن
              </Button>
            )}

            {status.permission === "granted" && (
              <Button onClick={registerForPush} disabled={loading}>
                تسجيل للإشعارات
              </Button>
            )}

            {status.fcmToken && (
              <Button onClick={sendTestNotification} disabled={loading} variant="secondary">
                إرسال إشعار تجريبي
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
