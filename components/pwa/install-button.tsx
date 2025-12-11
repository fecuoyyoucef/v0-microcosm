"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const INSTALL_PROMPT_KEY = "synaptic_install_prompt_dismissed"
const INSTALL_PROMPT_INTERVAL = 3 * 24 * 60 * 60 * 1000 // 3 days

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(true)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    if (isStandalone) {
      setIsInstalled(true)
      setShowButton(false)
      return
    }

    setIsInstalled(false)

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowButton(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setShowButton(false)
    }

    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setIsInstalled(true)
      setShowButton(false)
    }
    setDeferredPrompt(null)
  }

  if (isInstalled || !showButton || !deferredPrompt) return null

  return (
    <Button onClick={handleInstall} variant="ghost" size="sm" className="gap-2 text-xs">
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">تثبيت</span>
    </Button>
  )
}

export function InstallPromptNotification() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    if (isStandalone) return

    const lastDismissed = localStorage.getItem(INSTALL_PROMPT_KEY)
    if (lastDismissed) {
      const timeSinceDismissed = Date.now() - Number.parseInt(lastDismissed, 10)
      if (timeSinceDismissed < INSTALL_PROMPT_INTERVAL) {
        return
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShow(true), 3000)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    window.addEventListener("appinstalled", () => {
      setShow(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setShow(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    localStorage.setItem(INSTALL_PROMPT_KEY, Date.now().toString())
    setShow(false)
  }

  if (!show || !deferredPrompt) return null

  return (
    <div className="fixed bottom-20 inset-x-0 z-50 px-4 pointer-events-none">
      <div
        className="max-w-sm mx-auto bg-card border rounded-xl shadow-xl p-3 pointer-events-auto animate-in slide-in-from-bottom duration-300"
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full shrink-0">
            <Download className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">ثبّت التطبيق</p>
            <p className="text-xs text-muted-foreground truncate">إشعارات فورية ووصول سريع</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" onClick={handleInstall} className="h-8 px-3 text-xs">
              تثبيت
            </Button>
            <Button size="icon" variant="ghost" onClick={handleDismiss} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
