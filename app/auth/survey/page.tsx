"use client"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Loader2, ChevronRight, ChevronLeft, Check, Sparkles } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface InterestCategory {
  id: string
  name: string
  name_ar: string
  interests: Interest[]
}

interface Interest {
  id: string
  name: string
  name_ar: string
}

const QUESTIONS = [
  {
    id: "goal",
    question: "ما هو هدفك الرئيسي من الانضمام إلى Synaptic Space؟",
    placeholder: "مثال: أبحث عن مجتمع فكري للنقاشات العميقة حول التقنية والفلسفة...",
  },
  {
    id: "skills",
    question: "ما هي المهارة أو المعرفة التي يمكنك مشاركتها مع الآخرين؟",
    placeholder: "مثال: لدي خبرة 5 سنوات في تطوير الويب ويمكنني مساعدة المبتدئين...",
  },
  {
    id: "best_conversation",
    question: "صف أفضل تجربة حوار أو نقاش مررت بها مؤخرًا (الموضوع، الأسلوب، النتيجة)",
    placeholder: "مثال: نقاش حول الذكاء الاصطناعي مع زملاء العمل، كان حواراً محترماً انتهى بأفكار جديدة...",
  },
  {
    id: "time_wasters",
    question: 'ما هو الشيء الذي تراه مضيعة للوقت أو "تفاهة" في تطبيقات التواصل الأخرى؟',
    placeholder: "مثال: المحتوى السطحي والجدالات العقيمة والإشعارات المزعجة...",
  },
  {
    id: "dream_cell_topic",
    question: 'إذا كان بإمكانك إنشاء "خلية حوار" واحدة الآن، فما هو موضوعها الدقيق؟',
    placeholder: "مثال: خلية لمناقشة تأثير الذكاء الاصطناعي على سوق العمل في الخليج...",
  },
]

export default function SurveyPage() {
  const [currentStep, setCurrentStep] = useState(0) // 0-4 للأسئلة، 5 للاهتمامات
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [categories, setCategories] = useState<InterestCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Check if survey already completed
      const { data: survey } = await supabase
        .from("user_surveys")
        .select("completed_at")
        .eq("user_id", user.id)
        .single()

      if (survey?.completed_at) {
        router.push("/chat")
        return
      }

      setUser({ id: user.id })

      // Load interest categories
      const { data: categoriesData } = await supabase
        .from("interest_categories")
        .select("id, name, name_ar")
        .order("sort_order")

      if (categoriesData) {
        const categoriesWithInterests: InterestCategory[] = []

        for (const cat of categoriesData) {
          const { data: interests } = await supabase
            .from("interests")
            .select("id, name, name_ar")
            .eq("category_id", cat.id)
            .order("sort_order")

          categoriesWithInterests.push({
            ...cat,
            interests: interests || [],
          })
        }

        setCategories(categoriesWithInterests)
      }

      setIsLoadingData(false)
    }

    checkAuth()
  }, [supabase, router])

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId],
    )
  }

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!user) return

    setIsLoading(true)

    try {
      const { error } = await supabase.from("user_surveys").upsert({
        user_id: user.id,
        goal: answers.goal || null,
        skills: answers.skills || null,
        best_conversation: answers.best_conversation || null,
        time_wasters: answers.time_wasters || null,
        dream_cell_topic: answers.dream_cell_topic || null,
        interests: selectedInterests,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      router.push("/chat")
      router.refresh()
    } catch (error) {
      console.error("Error saving survey:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = async () => {
    if (!user) return

    setIsLoading(true)

    try {
      // Save partial data if any
      const { error } = await supabase.from("user_surveys").upsert({
        user_id: user.id,
        goal: answers.goal || null,
        skills: answers.skills || null,
        best_conversation: answers.best_conversation || null,
        time_wasters: answers.time_wasters || null,
        dream_cell_topic: answers.dream_cell_topic || null,
        interests: selectedInterests,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      router.push("/chat")
      router.refresh()
    } catch (error) {
      console.error("Error skipping survey:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const currentQuestion = QUESTIONS[currentStep]
  const isLastQuestion = currentStep === 4
  const isInterestsStep = currentStep === 5
  const canProceed =
    currentStep < 5 ? (answers[currentQuestion?.id]?.trim().length || 0) >= 10 : selectedInterests.length >= 3

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex flex-col items-center gap-2 mb-3">
            <Image
              src="/icons/app-logo.jpg"
              alt="Synaptic Space"
              width={56}
              height={56}
              className="rounded-xl shadow-lg"
            />
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              تعرّف علينا أكثر
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">ساعدنا في فهمك لنقدم لك تجربة أفضل</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>السؤال {Math.min(currentStep + 1, 5)} من 5</span>
            <span>{isInterestsStep ? "اختر اهتماماتك" : `${Math.round((currentStep / 5) * 100)}%`}</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / 6) * 100}%` }}
            />
          </div>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="p-6">
            {!isInterestsStep ? (
              // Questions Step
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold mb-1">{currentQuestion.question}</h2>
                    <p className="text-xs text-muted-foreground">الإجابة اختيارية لكنها تساعدنا في تحسين تجربتك</p>
                  </div>
                </div>

                <Textarea
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder={currentQuestion.placeholder}
                  className="min-h-[120px] bg-background resize-none"
                  dir="rtl"
                />

                <p className="text-xs text-muted-foreground text-left">
                  {answers[currentQuestion.id]?.length || 0} حرف
                </p>
              </div>
            ) : (
              // Interests Step
              <div className="space-y-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">اختر اهتماماتك</h2>
                    <p className="text-xs text-muted-foreground">
                      اختر 3 اهتمامات على الأقل • تم اختيار {selectedInterests.length}
                    </p>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-4 pr-1">
                  {categories.map((category) => (
                    <div key={category.id} className="space-y-2">
                      <h3 className="text-sm font-medium text-primary sticky top-0 bg-card py-1">{category.name_ar}</h3>
                      <div className="flex flex-wrap gap-2">
                        {category.interests.map((interest) => (
                          <button
                            key={interest.id}
                            type="button"
                            onClick={() => toggleInterest(interest.name)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs transition-all",
                              selectedInterests.includes(interest.name)
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
                            )}
                          >
                            {selectedInterests.includes(interest.name) && (
                              <Check className="w-3 h-3 inline-block ml-1" />
                            )}
                            {interest.name_ar}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
                    <ChevronRight className="w-4 h-4 ml-1" />
                    السابق
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={handleSkip} disabled={isLoading}>
                  تخطي
                </Button>

                {isInterestsStep ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isLoading || selectedInterests.length < 3}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Check className="w-4 h-4 ml-1" />}
                    إنهاء
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={handleNext}>
                    {isLastQuestion ? "الاهتمامات" : "التالي"}
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skip hint */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          يمكنك تخطي هذا الاستبيان والعودة إليه لاحقاً من الإعدادات
        </p>
      </div>
    </div>
  )
}
