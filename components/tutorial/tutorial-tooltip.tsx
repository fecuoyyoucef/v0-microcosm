"use client"

import type React from "react"
import { useTutorial } from "@/lib/contexts/tutorial-context"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

export function TutorialTooltip() {
  const { isActive, currentStepIndex, steps, nextStep, previousStep, skipTutorial } = useTutorial()

  if (!isActive || !steps[currentStepIndex]) return null

  const step = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  const getTooltipPosition = () => {
    const element = document.querySelector(step.targetSelector)
    if (!element) return {}

    const rect = element.getBoundingClientRect()
    const padding = 16

    switch (step.position || "bottom") {
      case "top":
        return {
          top: `${rect.top - padding}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: "translateX(-50%) translateY(-100%)",
        }
      case "bottom":
        return {
          top: `${rect.bottom + padding}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: "translateX(-50%)",
        }
      case "left":
        return {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.left - padding}px`,
          transform: "translateY(-50%) translateX(-100%)",
        }
      case "right":
        return {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + padding}px`,
          transform: "translateY(-50%)",
        }
      default:
        return {}
    }
  }

  return (
    <div
      className="fixed bg-white text-gray-900 rounded-lg shadow-lg p-4 max-w-xs z-50 border border-gray-200"
      style={getTooltipPosition() as React.CSSProperties}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm">{step.title}</h3>
        <button onClick={skipTutorial} className="text-gray-400 hover:text-gray-600" aria-label="إغلاق التورتوريال">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-3">{step.description}</p>

      {step.action && <p className="text-xs text-blue-600 mb-3 font-medium bg-blue-50 p-2 rounded">{step.action}</p>}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {currentStepIndex + 1} من {steps.length}
        </span>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={previousStep}
            disabled={isFirstStep}
            className="text-xs bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button variant="default" size="sm" onClick={nextStep} className="text-xs">
            {isLastStep ? "انتهى" : "التالي"}
            {!isLastStep && <ChevronRight className="w-4 h-4 mr-1" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
