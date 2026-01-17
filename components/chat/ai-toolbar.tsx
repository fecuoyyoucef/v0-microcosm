"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { useFeature } from "@/hooks/use-features"
import {
  Sparkles,
  Brain,
  FileText,
  BookOpen,
  Lightbulb,
  Search,
  Languages,
  Loader2,
  CheckCircle,
  ChevronDown,
} from "lucide-react"

interface AIToolbarProps {
  groupId: string
  messages: Array<{ id: string; content: string; sender_id: string; created_at: string }>
  onInsertSummary?: (summary: string) => void
}

interface AITool {
  id: string
  featureKey: string
  icon: React.ReactNode
  label: string
  description: string
  action: () => Promise<void>
}

export function AIToolbar({ groupId, messages, onInsertSummary }: AIToolbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeDialog, setActiveDialog] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [translateText, setTranslateText] = useState("")

  // Feature flags
  const aiAssistantEnabled = useFeature("ai_assistant")
  const smartSummaryEnabled = useFeature("smart_summary")
  const discussionQualityEnabled = useFeature("discussion_quality")
  const semanticSearchEnabled = useFeature("semantic_search")
  const messageTranslationEnabled = useFeature("message_translation")
  const discussionQuestionsEnabled = useFeature("discussion_questions")
  const dailyMemoryEnabled = useFeature("daily_memory")

  // If no AI features are enabled, don't show toolbar
  const hasAnyFeature =
    aiAssistantEnabled ||
    smartSummaryEnabled ||
    discussionQualityEnabled ||
    semanticSearchEnabled ||
    messageTranslationEnabled ||
    discussionQuestionsEnabled ||
    dailyMemoryEnabled

  if (!hasAnyFeature) return null

  const handleSmartSummary = async () => {
    setIsLoading(true)
    setActiveDialog("summary")
    try {
      const res = await fetch("/api/ai/analyze-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, limit: 50 }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data.summary || "لا يوجد ملخص متاح")
      } else {
        setResult("فشل في إنشاء الملخص")
      }
    } catch {
      setResult("حدث خطأ")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDiscussionQuality = async () => {
    setIsLoading(true)
    setActiveDialog("quality")
    try {
      const res = await fetch("/api/ai/assess-discussion-quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(
          `جودة النقاش: ${data.score}/10\n\n${data.strengths ? "نقاط القوة:\n" + data.strengths.join("\n") : ""}\n\n${data.improvements ? "مقترحات للتحسين:\n" + data.improvements.join("\n") : ""}`,
        )
      } else {
        setResult("فشل في تقييم جودة النقاش")
      }
    } catch {
      setResult("حدث خطأ")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateQuestions = async () => {
    setIsLoading(true)
    setActiveDialog("questions")
    try {
      const res = await fetch("/api/ai/generate-discussion-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data.questions?.join("\n\n") || "لا توجد أسئلة")
      } else {
        setResult("فشل في توليد الأسئلة")
      }
    } catch {
      setResult("حدث خطأ")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/ai/semantic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, query: searchQuery }),
      })
      if (res.ok) {
        const data = await res.json()
        const results = data.results || []
        setResult(results.length > 0 ? results.map((r: any) => `• ${r.content}`).join("\n\n") : "لا توجد نتائج")
      } else {
        setResult("فشل البحث")
      }
    } catch {
      setResult("حدث خطأ")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTranslate = async () => {
    if (!translateText.trim()) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/ai/translate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: translateText, targetLang: "en" }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data.translated || "فشلت الترجمة")
      } else {
        setResult("فشلت الترجمة")
      }
    } catch {
      setResult("حدث خطأ")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDailyMemory = async () => {
    setIsLoading(true)
    setActiveDialog("memory")
    try {
      const res = await fetch("/api/ai/generate-daily-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data.memory || "لا توجد ذكريات لليوم")
      } else {
        setResult("فشل في إنشاء الذاكرة")
      }
    } catch {
      setResult("حدث خطأ")
    } finally {
      setIsLoading(false)
    }
  }

  const closeDialog = () => {
    setActiveDialog(null)
    setResult(null)
    setSearchQuery("")
    setTranslateText("")
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary" data-toolbar>
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="end" data-toolbar>
          <div className="space-y-1">
            {smartSummaryEnabled && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-9"
                onClick={() => {
                  setIsOpen(false)
                  handleSmartSummary()
                }}
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span>ملخص ذكي</span>
              </Button>
            )}

            {discussionQualityEnabled && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-9"
                onClick={() => {
                  setIsOpen(false)
                  handleDiscussionQuality()
                }}
              >
                <Brain className="w-4 h-4 text-purple-500" />
                <span>تقييم جودة النقاش</span>
              </Button>
            )}

            {discussionQuestionsEnabled && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-9"
                onClick={() => {
                  setIsOpen(false)
                  handleGenerateQuestions()
                }}
              >
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>أسئلة للنقاش</span>
              </Button>
            )}

            {semanticSearchEnabled && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-9"
                onClick={() => {
                  setIsOpen(false)
                  setActiveDialog("search")
                }}
              >
                <Search className="w-4 h-4 text-emerald-500" />
                <span>بحث دلالي</span>
              </Button>
            )}

            {messageTranslationEnabled && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-9"
                onClick={() => {
                  setIsOpen(false)
                  setActiveDialog("translate")
                }}
              >
                <Languages className="w-4 h-4 text-cyan-500" />
                <span>ترجمة</span>
              </Button>
            )}

            {dailyMemoryEnabled && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-9"
                onClick={() => {
                  setIsOpen(false)
                  handleDailyMemory()
                }}
              >
                <BookOpen className="w-4 h-4 text-rose-500" />
                <span>ذاكرة اليوم</span>
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Summary Dialog */}
      <Dialog open={activeDialog === "summary"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              ملخص المحادثة
            </DialogTitle>
            <DialogDescription>ملخص ذكي لآخر الرسائل في المحادثة</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm">{result}</div>
            )}
          </ScrollArea>
          {result && onInsertSummary && (
            <Button onClick={() => onInsertSummary(result)} className="gap-2">
              <CheckCircle className="w-4 h-4" />
              إدراج في المحادثة
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Quality Dialog */}
      <Dialog open={activeDialog === "quality"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              تقييم جودة النقاش
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm">{result}</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Questions Dialog */}
      <Dialog open={activeDialog === "questions"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              أسئلة مقترحة للنقاش
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm">{result}</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={activeDialog === "search"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-500" />
              بحث دلالي
            </DialogTitle>
            <DialogDescription>ابحث في الرسائل بالمعنى وليس الكلمات فقط</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ما الذي تبحث عنه؟"
                rows={2}
              />
              <Button onClick={handleSemanticSearch} disabled={isLoading || !searchQuery.trim()}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {result && (
              <ScrollArea className="max-h-60 border rounded-lg p-3">
                <div className="whitespace-pre-wrap text-sm">{result}</div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Translate Dialog */}
      <Dialog open={activeDialog === "translate"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-cyan-500" />
              ترجمة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={translateText}
              onChange={(e) => setTranslateText(e.target.value)}
              placeholder="أدخل النص للترجمة..."
              rows={3}
            />
            <Button onClick={handleTranslate} disabled={isLoading || !translateText.trim()} className="w-full">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              ترجم إلى الإنجليزية
            </Button>
            {result && (
              <div className="border rounded-lg p-3 bg-muted/50">
                <p className="text-sm">{result}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Memory Dialog */}
      <Dialog open={activeDialog === "memory"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-rose-500" />
              ذاكرة اليوم
            </DialogTitle>
            <DialogDescription>ملخص أهم ما حدث اليوم</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm">{result}</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
