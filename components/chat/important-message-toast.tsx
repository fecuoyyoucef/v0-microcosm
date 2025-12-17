"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Message } from "@/lib/types"

interface ImportantMessageToastProps {
  message: Message
  onClose: () => void
}

export function ImportantMessageToast({ message, onClose }: ImportantMessageToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const duration = 30000
    const interval = 50
    const decrement = (interval / duration) * 100

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement
        if (next <= 0) {
          clearInterval(timer)
          handleClose()
          return 0
        }
        return next
      })
    }, interval)

    return () => clearInterval(timer)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
      )}
    >
      <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl shadow-2xl border border-orange-400/50 backdrop-blur-xl overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-white/80 transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-lg">🟠</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-sm">رسالة مهمة</h4>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {message.sender?.display_name || "مستخدم"}
                </span>
              </div>

              <p className="text-sm leading-relaxed line-clamp-3 text-white/95">{message.content}</p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="flex-shrink-0 h-6 w-6 p-0 hover:bg-white/20 text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
