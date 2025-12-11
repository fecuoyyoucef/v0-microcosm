"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const INSTALL_PROMPT_KEY = "synaptic_install_prompt_dismissed"
const INSTALL_PROMPT_INTERVAL = 3 * 24 * 60 * 60 * 1000 // 3 days

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(true) // Start as true to avoid flash
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    if (isStandalone) {
      setIsInstalled(true)
      setShowButton(false)
      return
    }

    setIsInstalled(false)

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowButton(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Listen for app installed
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

    // Trigger install prompt directly
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      setIsInstalled(true)
      setShowButton(false)
    }
    setDeferredPrompt(null)
  }

  // Don't show if installed or no prompt available
  if (isInstalled || !showButton || !deferredPrompt) return null

  return (
    <Button onClick={handleInstall} variant="ghost" size="sm" className="gap-2 text-xs">
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">تثبيت</span>
    </Button>
  )
}

// Separate component for the recurring install prompt notification
export function InstallPromptNotification() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    if (isStandalone) return

    // Check if we should show the prompt
    const lastDismissed = localStorage.getItem(INSTALL_PROMPT_KEY)
    if (lastDismissed) {
      const timeSinceDismissed = Date.now() - Number.parseInt(lastDismissed, 10)
      if (timeSinceDismissed < INSTALL_PROMPT_INTERVAL) {
        return // Don't show yet
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show notification after 3 seconds
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
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-card border rounded-lg shadow-lg p-4" dir="rtl">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">ثبّت التطبيق</p>
            <p className="text-xs text-muted-foreground mt-1">احصل على إشعارات فورية ووصول سريع من شاشتك الرئيسية</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={handleInstall} className="flex-1">
            <Download className="w-4 h-4 ml-1" />
            تثبيت
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            لاحقاً
          </Button>
        </div>
      </div>
    </div>
  )
}
