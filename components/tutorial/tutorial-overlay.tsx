"use client"

import { useEffect, useState } from "react"
import { useTutorial } from "@/lib/contexts/tutorial-context"

interface ElementPosition {
  top: number
  left: number
  width: number
  height: number
}

export function TutorialOverlay() {
  const { isActive, currentStepIndex, steps } = useTutorial()
  const [position, setPosition] = useState<ElementPosition | null>(null)

  useEffect(() => {
    if (!isActive || !steps[currentStepIndex]) return

    const updatePosition = () => {
      const selector = steps[currentStepIndex].targetSelector
      const element = document.querySelector(selector)

      if (element) {
        const rect = element.getBoundingClientRect()
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        })
      }
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    return () => window.removeEventListener("resize", updatePosition)
  }, [isActive, currentStepIndex, steps])

  if (!isActive || !position) return null

  const padding = 8

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        style={{
          clipPath: `polygon(
            0% 0%,
            0% 100%,
            100% 100%,
            100% 0%,
            0% 0%,
            ${position.left - padding}px ${position.top - padding}px,
            ${position.left - padding}px ${position.top + position.height + padding}px,
            ${position.left + position.width + padding}px ${position.top + position.height + padding}px,
            ${position.left + position.width + padding}px ${position.top - padding}px,
            ${position.left - padding}px ${position.top - padding}px
          )`,
        }}
      />

      <div
        className="fixed border-2 border-blue-500 rounded-lg pointer-events-none z-40"
        style={{
          top: position.top - padding,
          left: position.left - padding,
          width: position.width + padding * 2,
          height: position.height + padding * 2,
          boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.5)",
        }}
      />
    </>
  )
}
