"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getSuggestedCells, getEnhancedCompatibility } from "@/lib/synaptic-matching"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Loader2, Users, Sparkles, ChevronLeft, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface SuggestedCellsProps {
  userId: string
}

interface MatchResult {
  groupId: string
  groupName: string
  groupDescription?: string
  groupImage?: string
  memberCount: number
  compatibilityScore: number
  sharedInterests: string[]
  cellType?: string
}

export function SuggestedCells({ userId }: SuggestedCellsProps) {
  const [cells, setCells] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [enhancedMode, setEnhancedMode] = useState(false)
  const [requestingJoin, setRequestingJoin] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAndLoad = async () => {
      try {
        // فحص إذا كان النظام مفعلاً
        const { data: setting, error: settingError } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "synaptic_matching_enabled")
          .single()

        if (settingError && settingError.code !== "PGRST116") {
          console.error("[v0] Error fetching setting:", settingError)
          setLoading(false)
          return
        }

        const isEnabled = setting?.value === "true" || setting?.value === true
        setEnabled(isEnabled)

        if (!isEnabled) {
          setLoading(false)
          return
        }

        console.log("[v0] Fetching suggested cells for user:", userId)

        // جلب الخلايا المقترحة
        let suggested = await getSuggestedCells(userId, 10)

        // تجربة تحسين التوافق باستخدام الذكاء الاصطناعي
        if (suggested.length > 0) {
          try {
            const enhanced = await getEnhancedCompatibility(userId, suggested)
            if (enhanced && enhanced.length > 0) {
              suggested = enhanced
              setEnhancedMode(true)
            }
          } catch (error) {
            console.log("[v0] AI enhancement not available, using basic matching")
          }
        }

        console.log("[v0] Loaded suggested cells:", suggested.length)
        setCells(suggested)
      } catch (error) {
        console.error("[v0] Error loading suggested cells:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAndLoad()
  }, [userId, supabase])

  const handleJoinRequest = async (groupId: string) => {
    setRequestingJoin(groupId)

    try {
      const { error } = await supabase.from("join_requests").insert({
        group_id: groupId,
        user_id: userId,
        status: "pending",
      })

      if (error) {
        if (error.code === "23505") {
          alert("لقد أرسلت طلب انضمام مسبقاً")
        } else {
          throw error
        }
      } else {
        alert("تم إرسال طلب الانضمام بنجاح")
        setCells((prev) => prev.filter((c) => c.groupId !== groupId))
      }
    } catch (error) {
      console.error("Error requesting join:", error)
      alert("حدث خطأ أثناء إرسال الطلب")
    } finally {
      setRequestingJoin(null)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500 bg-green-500/10"
    if (score >= 60) return "text-yellow-500 bg-yellow-500/10"
    if (score >= 40) return "text-orange-500 bg-orange-500/10"
    return "text-red-500 bg-red-500/10"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "توافق عالي"
    if (score >= 60) return "توافق جيد"
    if (score >= 40) return "توافق متوسط"
    return "توافق منخفض"
  }

  if (!enabled) return null

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">خلايا مقترحة لك</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (cells.length === 0) return null

  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className={cn("w-4 h-4", enhancedMode ? "text-amber-500" : "text-primary")} />
          <span className="text-sm font-medium">خلايا مقترحة لك</span>
          {enhancedMode && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              مدعوم بـ AI
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => router.push("/chat/explore")}>
          عرض الكل
          <ChevronLeft className="w-3 h-3 mr-1" />
        </Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-2">
          {cells.slice(0, 5).map((cell) => (
            <Card
              key={cell.groupId}
              className="w-[200px] shrink-0 bg-card/50 hover:bg-card transition-colors cursor-pointer"
              onClick={() => router.push(`/chat/${cell.groupId}/preview`)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2 mb-2">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={cell.groupImage || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {cell.groupName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{cell.groupName}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{cell.memberCount}</span>
                    </div>
                  </div>
                </div>

                {/* درجة التوافق */}
                <div className={cn("rounded-lg p-2 mb-2 text-center", getScoreColor(cell.compatibilityScore))}>
                  <span className="text-lg font-bold">{cell.compatibilityScore}%</span>
                  <p className="text-[10px]">{getScoreLabel(cell.compatibilityScore)}</p>
                </div>

                {/* الاهتمامات المشتركة */}
                {cell.sharedInterests.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {cell.sharedInterests.slice(0, 2).map((interest) => (
                      <Badge key={interest} variant="secondary" className="text-[9px] px-1.5 py-0">
                        {interest}
                      </Badge>
                    ))}
                    {cell.sharedInterests.length > 2 && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        +{cell.sharedInterests.length - 2}
                      </Badge>
                    )}
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleJoinRequest(cell.groupId)
                  }}
                  disabled={requestingJoin === cell.groupId}
                >
                  {requestingJoin === cell.groupId ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3 ml-1" />
                      طلب انضمام
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
