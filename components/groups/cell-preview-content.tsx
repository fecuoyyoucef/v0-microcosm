"use client"

import { useState, useEffect } from "react"
import { getUserCellCompatibility, getEnhancedCompatibility } from "@/lib/synaptic-matching"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  Users,
  Sparkles,
  UserPlus,
  ArrowRight,
  Target,
  Layers,
  TrendingUp,
  MessageSquare,
  Flag,
  ClipboardList,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface GroupInfo {
  id: string
  name: string
  description?: string | null
  avatarUrl?: string | null
  cellCategory?: string | null
  goal?: string | null
  maxMembers?: number | null
  memberCount: number
}

interface CellPreviewContentProps {
  userId: string
  hasSurvey: boolean
  group: GroupInfo
}

interface Compatibility {
  score: number
  details: {
    interests: { score: number; shared: string[] }
    level: number
    goal: number
    style: number
  }
}

export function CellPreviewContent({ userId, hasSurvey, group }: CellPreviewContentProps) {
  const [compat, setCompat] = useState<Compatibility | null>(null)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [loading, setLoading] = useState(hasSurvey)
  const [requesting, setRequesting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!hasSurvey) return

    const load = async () => {
      try {
        const result = await getUserCellCompatibility(userId, group.id)
        if (result) {
          setCompat({ score: result.score, details: result.details })
        }
        setLoading(false)

        // التحسين بالذكاء الاصطناعي في الخلفية
        try {
          const enhanced = await getEnhancedCompatibility(userId, group.id)
          if (enhanced) {
            setCompat((prev) => (prev ? { ...prev, score: enhanced.finalScore } : prev))
            if (enhanced.explanation && enhanced.explanation !== "تحليل تقليدي فقط") {
              setAiExplanation(enhanced.explanation)
            }
          }
        } catch {
          // نبقي على المطابقة الأساسية
        }
      } catch (error) {
        console.error("[v0] Error loading compatibility:", error)
        setLoading(false)
      }
    }

    load()
  }, [userId, group.id, hasSurvey])

  const handleJoin = async () => {
    setRequesting(true)
    try {
      const res = await fetch("/api/groups/join-cell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data?.error === "Already a member") {
          router.push(`/chat/${group.id}`)
          return
        }
        throw new Error(data?.error || "فشل الطلب")
      } else if (data.type === "joined") {
        router.push(`/chat/${group.id}`)
      } else {
        alert("تم إرسال طلب الانضمام بنجاح، سيُراجعه مشرفو الخلية.")
        router.push("/chat/explore")
      }
    } catch (error) {
      console.error("[v0] Error joining cell:", error)
      alert("حدث خطأ أثناء إرسال الطلب")
    } finally {
      setRequesting(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400"
    if (score >= 60) return "text-amber-600 dark:text-amber-400"
    if (score >= 40) return "text-orange-600 dark:text-orange-400"
    return "text-muted-foreground"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "توافق عالٍ"
    if (score >= 60) return "توافق جيد"
    if (score >= 40) return "توافق متوسط"
    return "توافق منخفض"
  }

  const breakdownItems = compat
    ? [
        {
          icon: Target,
          label: "الاهتمامات المشتركة",
          score: Math.round(compat.details.interests.score),
          weight: "40%",
        },
        { icon: TrendingUp, label: "تطابق المستوى", score: Math.round(compat.details.level), weight: "20%" },
        { icon: Flag, label: "تطابق الأهداف", score: Math.round(compat.details.goal), weight: "20%" },
        { icon: MessageSquare, label: "أسلوب التفاعل", score: Math.round(compat.details.style), weight: "20%" },
      ]
    : []

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <Button variant="ghost" size="sm" className="mb-4 gap-1.5" onClick={() => router.push("/chat/explore")}>
        <ArrowRight className="size-4" />
        العودة للاكتشاف
      </Button>

      {/* بطاقة الخلية */}
      <Card className="mb-5 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Avatar className="size-16">
              <AvatarImage src={group.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-xl text-primary">
                {group.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-balance">{group.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {group.memberCount}
                  {group.maxMembers ? ` / ${group.maxMembers}` : ""} عضو
                </span>
                {group.cellCategory && (
                  <span className="flex items-center gap-1">
                    <Layers className="size-3.5" />
                    {group.cellCategory}
                  </span>
                )}
              </div>
            </div>
          </div>

          {group.description && (
            <p className="mt-4 text-sm leading-relaxed text-foreground/90">{group.description}</p>
          )}

          {group.goal && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <Flag className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">هدف الخلية</p>
                <p className="text-sm leading-relaxed">{group.goal}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* قسم التوافق */}
      {!hasSurvey ? (
        <Card className="mb-5">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <ClipboardList className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">أكمل استبيانك لرؤية مدى توافقك</p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                سنحلّل اهتماماتك وأهدافك لنخبرك لماذا تناسبك هذه الخلية.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push("/auth/survey")}>
              ابدأ الاستبيان
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card className="mb-5">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : compat ? (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              لماذا تناسبك هذه الخلية؟
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* الدرجة الكلية */}
            <div className="flex items-center justify-between rounded-xl bg-muted/40 p-4">
              <div>
                <p className="text-sm text-muted-foreground">درجة التوافق الكلية</p>
                <p className={cn("text-sm font-medium", getScoreColor(compat.score))}>
                  {getScoreLabel(compat.score)}
                </p>
              </div>
              <span className={cn("text-4xl font-bold", getScoreColor(compat.score))}>{compat.score}%</span>
            </div>

            {/* تفسير الذكاء الاصطناعي */}
            {aiExplanation && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm leading-relaxed">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <span>{aiExplanation}</span>
              </div>
            )}

            {/* التفصيل */}
            <div className="space-y-4">
              {breakdownItems.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <item.icon className="size-4" />
                      {item.label}
                      <span className="text-[10px] opacity-60">({item.weight})</span>
                    </span>
                    <span className="font-medium">{item.score}%</span>
                  </div>
                  <Progress value={item.score} className="h-1.5" />
                </div>
              ))}
            </div>

            {/* الاهتمامات المشتركة */}
            {compat.details.interests.shared.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">اهتمامات مشتركة</p>
                <div className="flex flex-wrap gap-1.5">
                  {compat.details.interests.shared.map((interest) => (
                    <Badge key={interest} variant="secondary" className="gap-1 text-xs">
                      <Target className="size-3" />
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* زر الانضمام */}
      <Button className="w-full gap-2" size="lg" disabled={requesting} onClick={handleJoin}>
        {requesting ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <>
            <UserPlus className="size-5" />
            طلب الانضمام إلى الخلية
          </>
        )}
      </Button>
    </div>
  )
}
