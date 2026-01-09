"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface TutorialStep {
  id: string
  title: string
  description: string
  targetSelector: string // CSS selector للعنصر المراد إضاءته
  action?: string // وصف العملية المطلوبة
  position?: "top" | "bottom" | "left" | "right" // موضع Tooltip
}

interface TutorialContextType {
  isActive: boolean
  currentStepIndex: number
  steps: TutorialStep[]
  startTutorial: (steps: TutorialStep[]) => void
  nextStep: () => void
  previousStep: () => void
  skipTutorial: () => void
  completeTutorial: () => void
  isCompleted: boolean
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [steps, setSteps] = useState<TutorialStep[]>([])
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem("tutorial_completed") === "true"
    setIsCompleted(completed)
  }, [])

  const startTutorial = (newSteps: TutorialStep[]) => {
    setSteps(newSteps)
    setCurrentStepIndex(0)
    setIsActive(true)
  }

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      completeTutorial()
    }
  }

  const previousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const skipTutorial = () => {
    setIsActive(false)
    setCurrentStepIndex(0)
  }

  const completeTutorial = () => {
    setIsActive(false)
    setIsCompleted(true)
    localStorage.setItem("tutorial_completed", "true")
  }

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStepIndex,
        steps,
        startTutorial,
        nextStep,
        previousStep,
        skipTutorial,
        completeTutorial,
        isCompleted,
      }}
    >
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const context = useContext(TutorialContext)
  if (!context) {
    throw new Error("useTutorial must be used within TutorialProvider")
  }
  return context
}
