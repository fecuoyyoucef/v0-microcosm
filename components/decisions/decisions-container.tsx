"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ChevronLeft,
  Hash,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import type { Group, Decision, DecisionVote, DecisionResults } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"

interface DecisionsContainerProps {
  groupId: string
  group: Group
  decisions: Decision[]
  currentUserId: string
  memberCount: number
}

export function DecisionsContainer({
  groupId,
  group,
  decisions: initialDecisions,
  currentUserId,
  memberCount,
}: DecisionsContainerProps) {
  const [decisions, setDecisions] = useState<Decision[]>(initialDecisions)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [votes, setVotes] = useState<Record<string, DecisionVote[]>>({})
  const [userVotes, setUserVotes] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    const fetchVotes = async () => {
      for (const decision of decisions) {
        const { data } = await supabase.from("decision_votes").select("*").eq("decision_id", decision.id)

        if (data) {
          setVotes((prev) => ({ ...prev, [decision.id]: data }))
          const myVote = data.find((v) => v.user_id === currentUserId)
          if (myVote) {
            setUserVotes((prev) => ({ ...prev, [decision.id]: myVote.vote }))
          }
        }
      }
    }
    fetchVotes()

    // Realtime subscription
    const channel = supabase
      .channel(`decisions-${groupId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "decisions", filter: `group_id=eq.${groupId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setDecisions((prev) => [payload.new as Decision, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setDecisions((prev) => prev.map((d) => (d.id === payload.new.id ? (payload.new as Decision) : d)))
          }
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "decision_votes" }, async (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const vote = payload.new as DecisionVote
          setVotes((prev) => {
            const existing = prev[vote.decision_id] || []
            const filtered = existing.filter((v) => v.user_id !== vote.user_id)
            return { ...prev, [vote.decision_id]: [...filtered, vote] }
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, decisions, currentUserId, supabase])

  const generateAISummary = async () => {
    if (!description) return
    setIsGeneratingAI(true)
    setAiError(null)
    try {
      const response = await fetch("/api/ai/summarize-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      })
      const data = await response.json()

      if (!response.ok) {
        setAiError(data.error || "فشل في التلخيص")
        return
      }

      if (data.summary) {
        setTitle(data.summary)
      }
    } catch (error) {
      console.error("AI Summary error:", error)
      setAiError("حدث خطأ في الاتصال بالذكاء الاصطناعي")
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    setIsSubmitting(true)

    const { error } = await supabase.from("decisions").insert({
      group_id: groupId,
      title: title.trim(),
      description: description.trim() || null,
      created_by: currentUserId,
      voting_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    if (!error) {
      await fetch("/api/activity/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: "decision_created",
          groupId,
          metadata: { decision_title: title.trim() },
        }),
      }).catch((err) => console.error("[v0] Failed to track decision:", err))

      setTitle("")
      setDescription("")
      setAiError(null)
      setIsCreateOpen(false)
    }
    setIsSubmitting(false)
  }

  const handleVote = async (decisionId: string, vote: "agree" | "disagree" | "neutral") => {
    const { error } = await supabase.from("decision_votes").upsert(
      {
        decision_id: decisionId,
        user_id: currentUserId,
        vote,
      },
      { onConflict: "decision_id,user_id" },
    )

    if (!error) {
      await fetch("/api/activity/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: "decision_voted",
          groupId,
          metadata: { decision_id: decisionId, vote },
        }),
      }).catch((err) => console.error("[v0] Failed to track vote:", err))

      setUserVotes((prev) => ({ ...prev, [decisionId]: vote }))
    }
  }

  const getResults = (decisionId: string): DecisionResults => {
    const decisionVotes = votes[decisionId] || []
    return {
      agree: decisionVotes.filter((v) => v.vote === "agree").length,
      disagree: decisionVotes.filter((v) => v.vote === "disagree").length,
      neutral: decisionVotes.filter((v) => v.vote === "neutral").length,
      total: decisionVotes.length,
    }
  }

  const getTimeRemaining = (endsAt: string) => {
    const end = new Date(endsAt)
    const now = new Date()
    if (end <= now) return "انتهى"
    return formatDistanceToNow(end, { locale: ar, addSuffix: true })
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
            <span className="text-muted-foreground">غرفة القرارات</span>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 ml-2" />
              قرار جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إنشاء قرار جديد</DialogTitle>
              <DialogDescription>
                اكتب الفكرة أو السؤال، سيتم تلخيصها تلقائياً وفتح التصويت لمدة 24 ساعة
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الفكرة أو السؤال</label>
                <Textarea
                  placeholder="ما رأيكم في..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateAISummary}
                  disabled={!description || isGeneratingAI}
                  className="w-full bg-transparent"
                >
                  {isGeneratingAI ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 ml-2" />
                  )}
                  تلخيص بالذكاء الاصطناعي
                </Button>
                {aiError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{aiError}</AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">العنوان المختصر</label>
                <Input placeholder="عنوان القرار..." value={title} onChange={(e) => setTitle(e.target.value)} />
                <p className="text-xs text-muted-foreground">يمكنك كتابة العنوان يدوياً أو استخدام الذكاء الاصطناعي</p>
              </div>
              <Button onClick={handleCreate} disabled={!title.trim() || isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "بدء التصويت"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Decisions List */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {decisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <span className="text-3xl">🗳️</span>
            </div>
            <p className="text-lg font-medium">لا توجد قرارات بعد</p>
            <p className="text-sm">أنشئ قراراً جديداً للتصويت عليه</p>
          </div>
        ) : (
          decisions.map((decision) => {
            const results = getResults(decision.id)
            const myVote = userVotes[decision.id]
            const isActive = decision.status === "voting" && new Date(decision.voting_ends_at) > new Date()
            const totalVotes = results.total
            const agreePercent = totalVotes > 0 ? (results.agree / totalVotes) * 100 : 0
            const disagreePercent = totalVotes > 0 ? (results.disagree / totalVotes) * 100 : 0

            return (
              <Card key={decision.id} className={!isActive ? "opacity-70" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{decision.title}</CardTitle>
                      {decision.description && (
                        <CardDescription className="mt-1">{decision.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isActive ? (
                        <>
                          <Clock className="w-3 h-3 ml-1" />
                          {getTimeRemaining(decision.voting_ends_at)}
                        </>
                      ) : decision.status === "closed" ? (
                        <>
                          <CheckCircle className="w-3 h-3 ml-1" />
                          منتهي
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 ml-1" />
                          ملغي
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Voting Buttons */}
                  {isActive && (
                    <div className="flex gap-2">
                      <Button
                        variant={myVote === "agree" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleVote(decision.id, "agree")}
                        className="flex-1"
                      >
                        <ThumbsUp className="w-4 h-4 ml-2" />
                        موافق
                      </Button>
                      <Button
                        variant={myVote === "neutral" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleVote(decision.id, "neutral")}
                        className="flex-1"
                      >
                        <Minus className="w-4 h-4 ml-2" />
                        محايد
                      </Button>
                      <Button
                        variant={myVote === "disagree" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleVote(decision.id, "disagree")}
                        className="flex-1"
                      >
                        <ThumbsDown className="w-4 h-4 ml-2" />
                        معارض
                      </Button>
                    </div>
                  )}

                  {/* Results */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">موافق: {results.agree}</span>
                      <span className="text-muted-foreground">محايد: {results.neutral}</span>
                      <span className="text-red-600">معارض: {results.disagree}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500 transition-all" style={{ width: `${agreePercent}%` }} />
                      <div className="h-full bg-red-500 transition-all" style={{ width: `${disagreePercent}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {totalVotes} من {memberCount} صوتوا
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
