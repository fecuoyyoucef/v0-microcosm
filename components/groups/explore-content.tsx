"use client"

import { useState, useEffect, useMemo } from "react"
import { getSuggestedCells, getEnhancedMatches, type MatchResult } from "@/lib/synaptic-matching"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import {
  Loader2,
  Users,
  Sparkles,
  UserPlus,
  Search,
  ArrowRight,
  ClipboardList,
  Target,
  Layers,
  Compass,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface ExploreContentProps {
  userId: string
  hasSurvey: boolean
}

type SortKey = "compatibility" | "members"
type FilterKey = "all" | "high" | "good"

export function ExploreContent({ userId, hasSurvey }: ExploreContentProps) {
  const [cells, setCells] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [enhancing, setEnhancing] = useState(false)
  const [enhancedMode, setEnhancedMode] = useState(false)
  const [requestingJoin, setRequestingJoin] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("compatibility")
  const [filterKey, setFilterKey] = useState<FilterKey>("all")
  const router = useRouter()

  useEffect(() => {
    if (!hasSurvey) {
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        const suggested = await getSuggestedCells(userId, 30)
        setCells(suggested)
        setLoading(false)

        if (suggested.length > 0) {
          setEnhancing(true)
          try {
            const enhanced = await getEnhancedMatches(userId, suggested)
            if (enhanced?.length) {
              setCells(enhanced)
              if (enhanced.some((c) => c.aiExplanation)) setEnhancedMode(true)
            }
          } catch {
            // نبقي على المطابقة الأساسية
          } finally {
            setEnhancing(false)
          }
        }
      } catch (error) {
        console.error("[v0] Error loading explore cells:", error)
        setLoading(false)
      }
    }

    load()
  }, [userId, hasSurvey])

  const handleJoinRequest = async (groupId: string) => {
    setRequestingJoin(groupId)
    try {
      const res = await fetch("/api/groups/join-cell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data?.error === "Already a member") {
          alert("أنت عضو في هذه الخلية بالفعل")
        } else {
          throw new Error(data?.error || "فشل الطلب")
        }
      } else if (data.type === "joined") {
        alert("تم الانضمام إلى الخلية بنجاح")
        setCells((prev) => prev.filter((c) => c.groupId !== groupId))
      } else {
        alert("تم إرسال طلب الانضمام بنجاح")
        setCells((prev) => prev.filter((c) => c.groupId !== groupId))
      }
    } catch (error) {
      console.error("[v0] Error requesting join:", error)
      alert("حدث خطأ أثناء إرسال الطلب")
    } finally {
      setRequestingJoin(null)
    }
  }

  const filteredCells = useMemo(() => {
    let result = [...cells]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (c) =>
          c.groupName.toLowerCase().includes(q) ||
          c.groupDescription?.toLowerCase().includes(q) ||
          c.sharedInterests.some((i) => i.toLowerCase().includes(q)),
      )
    }

    if (filterKey === "high") result = result.filter((c) => c.compatibilityScore >= 80)
    else if (filterKey === "good") result = result.filter((c) => c.compatibilityScore >= 60)

    result.sort((a, b) =>
      sortKey === "compatibility" ? b.compatibilityScore - a.compatibilityScore : b.memberCount - a.memberCount,
    )

    return result
  }, [cells, search, filterKey, sortKey])

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

  // حالة: المستخدم لم يكمل الاستبيان
  if (!hasSurvey) {
    return (
      <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList className="size-6" />
            </EmptyMedia>
            <EmptyTitle>أكمل استبيانك أولاً</EmptyTitle>
            <EmptyDescription>
              لنرشّح لك الخلايا الذهنية الأنسب، نحتاج أن نتعرّف على اهتماماتك وأهدافك وأسلوب تفكيرك. لن يستغرق الأمر سوى
              دقائق.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => router.push("/auth/survey")} className="gap-2">
            ابدأ الاستبيان
            <ArrowRight className="size-4" />
          </Button>
        </Empty>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      {/* الترويسة */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Compass className="size-5 text-primary" />
          <h1 className="text-xl font-bold text-balance">اكتشف خلاياك</h1>
          {enhancedMode && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Sparkles className="size-3" />
              مدعوم بالذكاء الاصطناعي
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          خلايا ذهنية مختارة بعناية بناءً على اهتماماتك وأهدافك وأسلوب تفكيرك.
        </p>
      </div>

      {/* البحث والفلترة */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن خلية أو اهتمام..."
            className="pr-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5">
            {(
              [
                { key: "all", label: "الكل" },
                { key: "good", label: "توافق 60%+" },
                { key: "high", label: "توافق 80%+" },
              ] as { key: FilterKey; label: string }[]
            ).map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filterKey === f.key ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => setFilterKey(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="mr-auto flex gap-1.5">
            <Button
              size="sm"
              variant={sortKey === "compatibility" ? "secondary" : "ghost"}
              className="h-8 text-xs"
              onClick={() => setSortKey("compatibility")}
            >
              الأعلى توافقاً
            </Button>
            <Button
              size="sm"
              variant={sortKey === "members" ? "secondary" : "ghost"}
              className="h-8 text-xs"
              onClick={() => setSortKey("members")}
            >
              الأكثر أعضاءً
            </Button>
          </div>
        </div>
      </div>

      {enhancing && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          نُحسّن أفضل الترشيحات بالذكاء الاصطناعي...
        </div>
      )}

      {/* المحتوى */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCells.length === 0 ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{cells.length === 0 ? "لا توجد خلايا متاحة" : "لا توجد نتائج مطابقة"}</EmptyTitle>
            <EmptyDescription>
              {cells.length === 0
                ? "لقد انضممت إلى كل الخلايا المتاحة، أو لا توجد خلايا جديدة حالياً. عُد لاحقاً!"
                : "جرّب تعديل البحث أو الفلاتر لرؤية المزيد من الخلايا."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredCells.map((cell) => (
            <Card
              key={cell.groupId}
              className="cursor-pointer transition-colors hover:bg-accent/40"
              onClick={() => router.push(`/chat/${cell.groupId}/preview`)}
            >
              <CardContent className="p-4">
                <div className="mb-3 flex items-start gap-3">
                  <Avatar className="size-12">
                    <AvatarImage src={cell.groupImage || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {cell.groupName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{cell.groupName}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {cell.memberCount} عضو
                      </span>
                      {cell.cellType && (
                        <span className="flex items-center gap-1">
                          <Layers className="size-3" />
                          {cell.cellType}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className={cn("text-2xl font-bold leading-none", getScoreColor(cell.compatibilityScore))}>
                      {cell.compatibilityScore}%
                    </span>
                    <p className="text-[10px] text-muted-foreground">{getScoreLabel(cell.compatibilityScore)}</p>
                  </div>
                </div>

                {cell.groupDescription && (
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                    {cell.groupDescription}
                  </p>
                )}

                <div className="mb-3">
                  <Progress value={cell.compatibilityScore} className="h-1.5" />
                </div>

                {cell.aiExplanation && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg bg-muted/50 p-2.5 text-xs leading-relaxed">
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                    <span className="text-muted-foreground">{cell.aiExplanation}</span>
                  </div>
                )}

                {cell.sharedInterests.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {cell.sharedInterests.slice(0, 4).map((interest) => (
                      <Badge key={interest} variant="secondary" className="gap-1 text-[10px]">
                        <Target className="size-2.5" />
                        {interest}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button
                  className="w-full gap-1.5"
                  size="sm"
                  disabled={requestingJoin === cell.groupId}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleJoinRequest(cell.groupId)
                  }}
                >
                  {requestingJoin === cell.groupId ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="size-4" />
                      طلب الانضمام
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
