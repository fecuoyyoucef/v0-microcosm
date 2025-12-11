"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface TooltipStep {
  id: string
  target: string
  title: string
  content: string
  position?: "top" | "bottom" | "left" | "right"
}

interface TooltipTourContextType {
  currentStep: string | null
  showStep: (stepId: string) => void
  dismissStep: () => void
  dismissAll: () => void
  hasSeenTour: boolean
}

const TooltipTourContext = createContext<TooltipTourContextType | null>(null)

export function useTooltipTour() {
  const context = useContext(TooltipTourContext)
  if (!context) {
    throw new Error("useTooltipTour must be used within TooltipTourProvider")
  }
  return context
}

interface TooltipTourProviderProps {
  children: ReactNode
  tourKey: string
  steps: TooltipStep[]
  autoStart?: boolean
  delay?: number
}

export function TooltipTourProvider({
  children,
  tourKey,
  steps,
  autoStart = true,
  delay = 1500,
}: TooltipTourProviderProps) {
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [hasSeenTour, setHasSeenTour] = useState(true)

  useEffect(() => {
    const seen = localStorage.getItem(`tour_${tourKey}`)
    if (!seen && autoStart) {
      setHasSeenTour(false)
      // Start tour after delay
      const timer = setTimeout(() => {
        if (steps.length > 0) {
          setCurrentStep(steps[0].id)
        }
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [tourKey, steps, autoStart, delay])

  const showStep = (stepId: string) => setCurrentStep(stepId)

  const dismissStep = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id)
    } else {
      dismissAll()
    }
  }

  const dismissAll = () => {
    setCurrentStep(null)
    setHasSeenTour(true)
    localStorage.setItem(`tour_${tourKey}`, "true")
  }

  return (
    <TooltipTourContext.Provider value={{ currentStep, showStep, dismissStep, dismissAll, hasSeenTour }}>
      {children}
    </TooltipTourContext.Provider>
  )
}

interface OnboardingTooltipProps {
  id: string
  title: string
  content: string
  position?: "top" | "bottom" | "left" | "right"
  children: ReactNode
}

export function OnboardingTooltip({ id, title, content, position = "bottom", children }: OnboardingTooltipProps) {
  const { currentStep, dismissStep, dismissAll } = useTooltipTour()
  const isActive = currentStep === id

  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  }

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-primary border-l-transparent border-r-transparent border-b-transparent border-8",
    bottom:
      "-top-4 left-1/2 -translate-x-1/2 border-b-primary border-l-transparent border-r-transparent border-t-transparent border-8",
    left: "left-full top-1/2 -translate-y-1/2 border-l-primary border-t-transparent border-b-transparent border-r-transparent border-8",
    right:
      "-left-4 top-1/2 -translate-y-1/2 border-r-primary border-t-transparent border-b-transparent border-l-transparent border-8",
  }

  return (
    <div className="relative">
      {children}
      {isActive && (
        <div
          className={cn(
            "absolute z-[100] bg-primary text-primary-foreground p-3 rounded-lg shadow-xl max-w-[260px] min-w-[200px] animate-in fade-in zoom-in-95",
            positionClasses[position],
          )}
        >
          <button onClick={dismissAll} className="absolute top-1 left-1 p-1 hover:bg-white/20 rounded">
            <X className="w-3 h-3" />
          </button>
          <p className="font-semibold text-sm mb-1">{title}</p>
          <p className="text-xs opacity-90 leading-relaxed">{content}</p>
          <button
            onClick={dismissStep}
            className="text-xs font-medium mt-2 bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors"
          >
            التالي
          </button>
          <div className={cn("absolute w-0 h-0", arrowClasses[position])} />
        </div>
      )}
    </div>
  )
}
