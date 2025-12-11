"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChevronLeft,
  Hash,
  Calendar,
  Brain,
  Sparkles,
  Loader2,
  Clock,
  Lightbulb,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import type { Group, CollectiveMemory } from "@/lib/types"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CollectiveMemoryContainerProps {
  groupId: string
  group: Group
  memories: CollectiveMemory[]
  currentUserId: string
}

export function CollectiveMemoryContainer({
  groupId,
  group,
  memories: initialMemories,
  currentUserId,
}: CollectiveMemoryContainerProps) {
  const [memories, setMemories] = useState<CollectiveMemory[]>(initialMemories)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState("timeline")
  const [error, setError] = useState<string | null>(null)

  const generateDailySummary = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const response = await fetch("/api/ai/generate-daily-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "فشل في إنشاء الملخص")
        return
      }

      if (data.memory) {
        setMemories((prev) => [data.memory, ...prev.filter((m) => m.id !== data.memory.id)])
      } else if (data.parsed) {
        // If memory wasn't saved but we got parsed data, still show success
        setError("تم إنشاء الملخص لكن فشل في حفظه")
      }
    } catch (error) {
      console.error("Error generating memory:", error)
      setError("حدث خطأ في الاتصال")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border px-4 flex items-center justify-between bg-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/chat/${groupId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-primary" />
            <span className="font-medium">{group.name}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">الذاكرة المشتركة</span>
          </div>
        </div>

        <Button size="sm" onClick={generateDailySummary} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Sparkles className="w-4 h-4 ml-2" />}
          إنشاء ملخص اليوم
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-card/30 shrink-0">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="timeline" className="gap-2">
              <Calendar className="w-4 h-4" />
              الجدول الزمني
            </TabsTrigger>
            <TabsTrigger value="highlights" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              أبرز النقاط
            </TabsTrigger>
            <TabsTrigger value="decisions" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              القرارات
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="timeline" className="flex-1 overflow-auto m-0 p-4 space-y-4">
          {memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                <Brain className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-lg font-medium">الذاكرة فارغة</p>
              <p className="text-sm">اضغط على "إنشاء ملخص اليوم" لتوليد أول ملخص</p>
            </div>
          ) : (
            memories.map((memory) => (
              <Card key={memory.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      {format(new Date(memory.summary_date), "EEEE، d MMMM yyyy", { locale: ar })}
                    </CardTitle>
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 ml-1" />
                      {memory.message_count} رسالة
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed">{memory.summary}</p>

                  {Array.isArray(memory.highlights) && memory.highlights.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">أبرز النقاط:</p>
                      <ul className="text-sm space-y-1">
                        {(memory.highlights as string[]).map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(memory.topics) && memory.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(memory.topics as string[]).map((topic, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="highlights" className="flex-1 overflow-auto m-0 p-4">
          {memories.flatMap((m) => m.highlights || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Lightbulb className="w-12 h-12 text-amber-500/50 mb-4" />
              <p>لا توجد نقاط بارزة بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {memories.flatMap((m) =>
                Array.isArray(m.highlights)
                  ? (m.highlights as string[]).map((h, i) => (
                      <Card key={`${m.id}-${i}`}>
                        <CardContent className="p-4 flex items-start gap-3">
                          <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm">{h}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(m.summary_date), "d MMMM", { locale: ar })}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  : [],
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="decisions" className="flex-1 overflow-auto m-0 p-4">
          {memories.flatMap((m) => m.decisions || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <CheckCircle className="w-12 h-12 text-green-500/50 mb-4" />
              <p>لا توجد قرارات مسجلة بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {memories.flatMap((m) =>
                Array.isArray(m.decisions)
                  ? (m.decisions as string[]).map((d, i) => (
                      <Card key={`${m.id}-${i}`}>
                        <CardContent className="p-4 flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm">{d}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(m.summary_date), "d MMMM", { locale: ar })}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  : [],
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
