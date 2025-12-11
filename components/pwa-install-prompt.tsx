"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Download, Smartphone } from "lucide-react"
import { useSettings } from "@/components/settings-provider"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const translations = {
  ar: {
    installApp: "تثبيت التطبيق",
    installDesc: "أضف Synaptic Space إلى شاشتك الرئيسية للوصول السريع",
    install: "تثبيت",
    later: "لاحقاً",
    iosInstructions: 'للتثبيت على iOS: اضغط على زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"',
  },
  en: {
    installApp: "Install App",
    installDesc: "Add Synaptic Space to your home screen for quick access",
    install: "Install",
    later: "Later",
    iosInstructions: 'To install on iOS: tap Share then "Add to Home Screen"',
  },
  fr: {
    installApp: "Installer l'app",
    installDesc: "Ajoutez Synaptic Space à votre écran d'accueil",
    install: "Installer",
    later: "Plus tard",
    iosInstructions: "Pour installer sur iOS: appuyez sur Partager puis \"Ajouter à l'écran d'accueil\"",
  },
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const { language } = useSettings()
  const t = translations[language]

  useEffect(() => {
    // التحقق من iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(isIOSDevice)

    // التحقق من وضع standalone
    const isInStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
    setIsStandalone(isInStandaloneMode)

    // التحقق مما إذا تم رفض التثبيت سابقاً
    const dismissed = localStorage.getItem("pwa-install-dismissed")
    const dismissedTime = dismissed ? Number.parseInt(dismissed) : 0
    const daysPassed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)

    // استماع لحدث beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // إظهار الـ prompt بعد 3 ثواني إذا لم يُرفض سابقاً أو مر أسبوع
      if (!dismissed || daysPassed > 7) {
        setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // إظهار تعليمات iOS إذا لم يكن مثبتاً
    if (isIOSDevice && !isInStandaloneMode && (!dismissed || daysPassed > 7)) {
      setTimeout(() => setShowPrompt(true), 3000)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("pwa-install-dismissed", Date.now().toString())
  }

  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4 mx-auto max-w-md">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold">{t.installApp}</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2" onClick={handleDismiss}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{isIOS ? t.iosInstructions : t.installDesc}</p>
            {!isIOS && deferredPrompt && (
              <div className="flex gap-2">
                <Button size="sm" className="gap-2" onClick={handleInstall}>
                  <Download className="w-4 h-4" />
                  {t.install}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  {t.later}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
