"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Send, BarChart3, Loader2, ArrowLeft, Trash2 } from "lucide-react"
import { useSettings } from "@/hooks/use-settings"
import { cn } from "@/lib/utils"

const translations = {
  ar: {
    questionnaires: "الاستبيانات",
    createNew: "إنشاء استبيان جديد",
    title: "العنوان",
    description: "الوصف (اختياري)",
    questions: "الأسئلة",
    addQuestion: "إضافة سؤال",
    questionText: "نص السؤال",
    questionType: "نوع السؤال",
    shortText: "نص قصير",
    singleChoice: "اختيار واحد",
    addOption: "إضافة خيار",
    publish: "نشر الآن",
    saveDraft: "حفظ كمسودة",
    close: "إغلاق",
    results: "النتائج",
    submitted: "تم الإرسال",
    responses: "الردود",
    noQuestionnaires: "لا توجد استبيانات حتى الآن",
    createFirst: "أنشئ أول استبيان لبدء جمع الآراء",
    submitAnswers: "إرسال الإجابات",
    incomplete: "يرجى ملء جميع الأسئلة الإلزامية",
    success: "تم إرسال إجاباتك بنجاح",
    responses_count: "عدد الردود",
    of: "من",
    members: "أعضاء",
    open: "مفتوح",
    closed: "مغلق",
  },
  en: {
    questionnaires: "Questionnaires",
    createNew: "Create New Questionnaire",
    title: "Title",
    description: "Description (optional)",
    questions: "Questions",
    addQuestion: "Add Question",
    questionText: "Question Text",
    questionType: "Question Type",
    shortText: "Short Text",
    singleChoice: "Single Choice",
    addOption: "Add Option",
    publish: "Publish Now",
    saveDraft: "Save as Draft",
    close: "Close",
    results: "Results",
    submitted: "Submitted",
    responses: "Responses",
    noQuestionnaires: "No questionnaires yet",
    createFirst: "Create the first questionnaire to start collecting feedback",
    submitAnswers: "Submit Answers",
    incomplete: "Please fill all required questions",
    success: "Your answers have been submitted successfully",
    responses_count: "Responses",
    of: "of",
    members: "members",
    open: "Open",
    closed: "Closed",
  },
}

interface Question {
  id?: string
  question_text: string
  question_type: "short_text" | "single_choice"
  options?: string[]
  sort_order: number
}

interface Questionnaire {
  id: string
  title: string
  description?: string
  status: "open" | "closed"
  created_at: string
  created_by?: string
  cell_questionnaire_questions?: { count: number }
  cell_questionnaire_responses?: { count: number }
}

export function QuestionnairesContainer({
  groupId,
  userId,
  isAdmin,
  initialQuestionnaires,
}: {
  groupId: string
  userId: string
  isAdmin: boolean
  initialQuestionnaires: Questionnaire[]
}) {
  const { language } = useSettings()
  const t = translations[language as "ar" | "en"]
  const isRTL = language === "ar"

  const [mode, setMode] = useState<"list" | "create" | "view">("list")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [questionnaires, setQuestionnaires] = useState(initialQuestionnaires)
  const [loading, setLoading] = useState(false)

  // Create mode state
  const [createTitle, setCreateTitle] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [createQuestions, setCreateQuestions] = useState<Question[]>([
    { question_text: "", question_type: "short_text", sort_order: 0, options: [] },
  ])

  // View/Response mode state
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<any>(null)
  const [userResponse, setUserResponse] = useState<any>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [formAnswers, setFormAnswers] = useState<Record<string, any>>({})
  const [submitLoading, setSubmitLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"respond" | "results">("respond")
  const [results, setResults] = useState<any>(null)

  // Fetch questionnaire details and user response
  const fetchQuestionnaireDetails = async (id: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/questionnaires/${id}`)
      const data = await res.json()
      setCurrentQuestionnaire(data.questionnaire)

      if (data.userResponse) {
        setHasAnswered(true)
        setFormAnswers({})
        if (isAdmin) {
          setViewMode("results")
          setResults(data.results)
        }
      } else {
        setHasAnswered(false)
        const initialAnswers: Record<string, any> = {}
        data.questionnaire.cell_questionnaire_questions?.forEach((q: any) => {
          initialAnswers[q.id] = q.question_type === "single_choice" ? "" : ""
        })
        setFormAnswers(initialAnswers)
        setViewMode("respond")
      }
    } catch (err) {
      console.error("[v0] Error fetching questionnaire:", err)
    } finally {
      setLoading(false)
    }
  }

  // Create questionnaire
  const handleCreate = async () => {
    if (!createTitle.trim()) return

    try {
      setLoading(true)
      const res = await fetch("/api/questionnaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: groupId,
          title: createTitle,
          description: createDesc,
          questions: createQuestions.filter((q) => q.question_text.trim()),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setQuestionnaires([data.questionnaire, ...questionnaires])
        setCreateTitle("")
        setCreateDesc("")
        setCreateQuestions([{ question_text: "", question_type: "short_text", sort_order: 0, options: [] }])
        setMode("list")
      }
    } catch (err) {
      console.error("[v0] Error creating questionnaire:", err)
    } finally {
      setLoading(false)
    }
  }

  // Submit responses
  const handleSubmitResponses = async () => {
    // Validate required fields
    for (const q of currentQuestionnaire.cell_questionnaire_questions) {
      if (!formAnswers[q.id] || (typeof formAnswers[q.id] === "string" && !formAnswers[q.id].trim())) {
        alert(t.incomplete)
        return
      }
    }

    try {
      setSubmitLoading(true)
      const res = await fetch(`/api/questionnaires/${currentQuestionnaire.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: formAnswers }),
      })

      if (res.ok) {
        alert(t.success)
        setHasAnswered(true)
        setViewMode("respond")
      }
    } catch (err) {
      console.error("[v0] Error submitting responses:", err)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Delete questionnaire (admin only)
  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاستبيان؟")) return

    try {
      const res = await fetch(`/api/questionnaires/${id}`, { method: "DELETE" })
      if (res.ok) {
        setQuestionnaires(questionnaires.filter((q) => q.id !== id))
      }
    } catch (err) {
      console.error("[v0] Error deleting questionnaire:", err)
    }
  }

  return (
    <div className={cn("p-6 space-y-6", isRTL ? "rtl" : "ltr")}>
      {/* List View */}
      {mode === "list" && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{t.questionnaires}</h1>
            {isAdmin && (
              <Button onClick={() => setMode("create")} className="gap-2">
                <Plus className="w-4 h-4" />
                {t.createNew}
              </Button>
            )}
          </div>

          {questionnaires.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-2">{t.noQuestionnaires}</p>
              {isAdmin && <p className="text-sm text-muted-foreground">{t.createFirst}</p>}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {questionnaires.map((q) => (
                <Card key={q.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold flex-1 line-clamp-2">{q.title}</h3>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(q.id)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <Badge variant={q.status === "open" ? "default" : "secondary"}>{t[q.status]}</Badge>
                    <p className="text-xs text-muted-foreground">
                      {q.cell_questionnaire_questions?.[0]?.count || 0} {t.questions}
                    </p>
                    <Button
                      onClick={() => {
                        setSelectedId(q.id)
                        setMode("view")
                        fetchQuestionnaireDetails(q.id)
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      {isAdmin ? t.results : t.submitted}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create View */}
      {mode === "create" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMode("list")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-bold">{t.createNew}</h2>
          </div>

          <Card className="p-6 space-y-4">
            <div>
              <Label>{t.title}</Label>
              <Input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder={t.title}
                className="mt-1"
              />
            </div>

            <div>
              <Label>{t.description}</Label>
              <Textarea
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder={t.description}
                className="mt-1"
              />
            </div>

            <div className="space-y-4">
              <Label>{t.questions}</Label>
              {createQuestions.map((q, idx) => (
                <div key={idx} className="p-4 border rounded-lg space-y-3">
                  <Input
                    value={q.question_text}
                    onChange={(e) => {
                      const newQuestions = [...createQuestions]
                      newQuestions[idx].question_text = e.target.value
                      setCreateQuestions(newQuestions)
                    }}
                    placeholder={t.questionText}
                  />

                  <select
                    value={q.question_type}
                    onChange={(e) => {
                      const newQuestions = [...createQuestions]
                      newQuestions[idx].question_type = e.target.value as any
                      if (e.target.value === "single_choice") {
                        newQuestions[idx].options = ["خيار 1", "خيار 2"]
                      }
                      setCreateQuestions(newQuestions)
                    }}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="short_text">{t.shortText}</option>
                    <option value="single_choice">{t.singleChoice}</option>
                  </select>

                  {q.question_type === "single_choice" && (
                    <div className="space-y-2">
                      {q.options?.map((opt, optIdx) => (
                        <div key={optIdx} className="flex gap-2">
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const newQuestions = [...createQuestions]
                              if (newQuestions[idx].options) {
                                newQuestions[idx].options[optIdx] = e.target.value
                                setCreateQuestions(newQuestions)
                              }
                            }}
                            placeholder={`${t.addOption} ${optIdx + 1}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newQuestions = [...createQuestions]
                              newQuestions[idx].options?.splice(optIdx, 1)
                              setCreateQuestions(newQuestions)
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newQuestions = [...createQuestions]
                          newQuestions[idx].options?.push(`${t.addOption} ${(q.options?.length || 0) + 1}`)
                          setCreateQuestions(newQuestions)
                        }}
                      >
                        + {t.addOption}
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              <Button
                variant="outline"
                onClick={() =>
                  setCreateQuestions([
                    ...createQuestions,
                    { question_text: "", question_type: "short_text", sort_order: createQuestions.length, options: [] },
                  ])
                }
              >
                + {t.addQuestion}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={loading || !createTitle.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.publish}
              </Button>
              <Button variant="outline" onClick={() => setMode("list")}>
                {t.close}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* View/Respond View */}
      {mode === "view" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMode("list")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-bold">{currentQuestionnaire?.title}</h2>
          </div>

          {loading ? (
            <Skeleton className="h-40" />
          ) : (
            <Card className="p-6 space-y-6">
              {/* Respond Form */}
              {!hasAnswered && viewMode === "respond" && (
                <>
                  {currentQuestionnaire?.cell_questionnaire_questions?.map((q: any) => (
                    <div key={q.id} className="space-y-3">
                      <Label className="text-base font-medium">{q.question_text}</Label>

                      {q.question_type === "short_text" && (
                        <Textarea
                          value={formAnswers[q.id] || ""}
                          onChange={(e) => setFormAnswers({ ...formAnswers, [q.id]: e.target.value })}
                          placeholder="إجابتك..."
                          rows={3}
                        />
                      )}

                      {q.question_type === "single_choice" && (
                        <RadioGroup value={formAnswers[q.id] || ""} onValueChange={(val) => setFormAnswers({ ...formAnswers, [q.id]: val })}>
                          {q.options?.map((opt: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <RadioGroupItem value={opt} id={`${q.id}-${idx}`} />
                              <Label htmlFor={`${q.id}-${idx}`} className="font-normal cursor-pointer">
                                {opt}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                  ))}

                  <Button onClick={handleSubmitResponses} disabled={submitLoading} className="w-full gap-2">
                    {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {t.submitAnswers}
                  </Button>
                </>
              )}

              {/* Results View (Admin) */}
              {viewMode === "results" && results && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BarChart3 className="w-4 h-4" />
                    <span>
                      {results.totalResponses} {t.responses_count} {t.of} {results.totalMembers} {t.members}
                    </span>
                  </div>

                  {results.questionResults?.map((qr: any) => (
                    <div key={qr.question_id} className="space-y-3">
                      <p className="font-medium">{qr.question_text}</p>

                      {qr.question_type === "short_text" && (
                        <div className="space-y-2">
                          {qr.answers?.map((ans: any, idx: number) => (
                            <div key={idx} className="p-3 bg-muted rounded text-sm">
                              {ans}
                            </div>
                          ))}
                        </div>
                      )}

                      {qr.question_type === "single_choice" && (
                        <div className="space-y-2">
                          {Object.entries(qr.choiceCounts || {}).map(([choice, count]: [string, any]) => (
                            <div key={choice} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span>{choice}</span>
                                <span className="font-medium">{count} ({Math.round((count / results.totalResponses) * 100)}%)</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${(count / results.totalResponses) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Submitted State */}
              {hasAnswered && (
                <div className="text-center py-8">
                  <p className="text-lg font-medium text-green-600">{t.submitted} ✓</p>
                  <p className="text-sm text-muted-foreground mt-2">شكراً لإجابتك على الاستبيان</p>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
