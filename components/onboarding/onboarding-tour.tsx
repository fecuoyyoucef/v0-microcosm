"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, ArrowRight, ArrowLeft, Sparkles, Users, MessageSquare, Target, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  page?: string
  position?: "center" | "top" | "bottom"
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "مرحباً في Microcosm",
    description: "تطبيق لبناء مجتمعات ذكية منظمة. دعنا نريك كيف يعمل!",
    icon: <Sparkles className="w-8 h-8 text-cyan-400" />,
    position: "center",
  },
  {
    id: "cells",
    title: "الخلايا (Cells)",
    description: "الخلايا هي مجموعات مصغّرة لمواضيع محددة. يمكنك إنشاء خلية أو الانضمام لخلايا موجودة.",
    icon: <Users className="w-8 h-8 text-green-400" />,
    page: "/chat",
  },
  {
    id: "nodes",
    title: "العقد (Nodes)",
    description: "داخل كل خلية، العقد تنظم المحادثات حسب المواضيع. مثل الغرف الفرعية.",
    icon: <MessageSquare className="w-8 h-8 text-blue-400" />,
  },
  {
    id: "decisions",
    title: "القرارات الجماعية",
    description: "يمكنك طرح قرارات للتصويت الجماعي وبناء توافق ذكي.",
    icon: <Target className="w-8 h-8 text-purple-400" />,
  },
  {
    id: "profile",
    title: "الألقاب والإنجازات",
    description: "كل نشاط يمنحك نقاطاً وألقاباً. شارك لتكسب ألقاباً مميزة!",
    icon: <TrendingUp className="w-8 h-8 text-orange-400" />,
    page: "/chat/profile",
  },
]

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("user_onboarding_progress")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (error) {
        console.log("[v0] Onboarding table not ready yet")
        return
      }

      if (!data || (!data.completed_at && !data.skipped)) {
        setIsOpen(true)
      }
    } catch (error) {
      console.error("[v0] Onboarding check error:", error)
      // Fail silently - don't crash the app
    }
  }

  const handleNext = async () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)

      const step = ONBOARDING_STEPS[nextStep]
      if (step.page) {
        router.push(step.page)
      }

      await updateProgress()
    } else {
      await completeOnboarding()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from("user_onboarding_progress").upsert({
        user_id: user.id,
        current_step: ONBOARDING_STEPS[currentStep].id,
        skipped: true,
      })
    } catch (error) {
      console.error("[v0] Skip onboarding error:", error)
    }

    setIsOpen(false)
    toast.info("يمكنك إعادة الجولة من الإعدادات في أي وقت")
  }

  const updateProgress = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("user_onboarding_progress")
        .select("completed_steps")
        .eq("user_id", user.id)
        .single()

      const completedSteps = data?.completed_steps || []
      completedSteps.push(ONBOARDING_STEPS[currentStep].id)

      await supabase.from("user_onboarding_progress").upsert({
        user_id: user.id,
        current_step: ONBOARDING_STEPS[currentStep + 1]?.id || "completed",
        completed_steps: completedSteps,
      })
    } catch (error) {
      console.error("[v0] Update progress error:", error)
    }
  }

  const completeOnboarding = async () => {
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from("user_onboarding_progress").upsert({
        user_id: user.id,
        current_step: "completed",
        completed_at: new Date().toISOString(),
        completed_steps: ONBOARDING_STEPS.map((s) => s.id),
      })
    } catch (error) {
      console.error("[v0] Complete onboarding error:", error)
    }

    setIsOpen(false)
    setLoading(false)
    toast.success("رائع! أنت الآن جاهز لاستكشاف Microcosm")
  }

  if (!isOpen) return null

  const step = ONBOARDING_STEPS[currentStep]
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-slate-800 border-slate-700 text-white p-6 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSkip}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="flex flex-col items-center text-center gap-4 mb-6">
          <div className="p-4 rounded-full bg-slate-700/50">{step.icon}</div>
          <h2 className="text-2xl font-bold">{step.title}</h2>
          <p className="text-slate-300 text-lg">{step.description}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-400">
              <span>
                الخطوة {currentStep + 1} من {ONBOARDING_STEPS.length}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex gap-3 justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="gap-2 bg-transparent"
            >
              <ArrowRight className="w-4 h-4" />
              السابق
            </Button>

            <Button onClick={handleNext} disabled={loading} className="gap-2 bg-cyan-600 hover:bg-cyan-700 flex-1">
              {currentStep === ONBOARDING_STEPS.length - 1 ? "ابدأ الآن!" : "التالي"}
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="ghost" onClick={handleSkip} className="w-full text-slate-400">
            تخطي الجولة
          </Button>
        </div>
      </Card>
    </div>
  )
}
