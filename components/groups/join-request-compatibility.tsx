"use client"

import { useState, useEffect } from "react"
import { getUserCellCompatibility } from "@/lib/synaptic-matching"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, Target, Users, Zap, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface JoinRequestCompatibilityProps {
  userId: string
  groupId: string
  compact?: boolean
}

export function JoinRequestCompatibility({ userId, groupId, compact = false }: JoinRequestCompatibilityProps) {
  const [data, setData] = useState<{
    score: number
    details: {
      interests: { score: number; shared: string[] }
      level: number
      goal: number
      style: number
    }
    userProfile: {
      goal?: string
      skills?: string
      interests?: string[]
    }
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const result = await getUserCellCompatibility(userId, groupId)
      setData(result)
      setLoading(false)
    }
    load()
  }, [userId, groupId])

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    if (score >= 40) return "text-orange-500"
    return "text-red-500"
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-yellow-500"
    if (score >= 40) return "bg-orange-500"
    return "bg-red-500"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-xs text-muted-foreground p-2 text-center">لم يكمل المستخدم الاستبيان بعد</div>
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={cn("text-lg font-bold", getScoreColor(data.score))}>{data.score}%</span>
        <span className="text-xs text-muted-foreground">توافق</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 bg-secondary/30 rounded-xl">
      <div className="text-center">
        <span className={cn("text-3xl font-bold", getScoreColor(data.score))}>{data.score}%</span>
        <p className="text-sm text-muted-foreground mt-1">درجة التوافق</p>
      </div>

      <div className="space-y-3">
        {/* الاهتمامات */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>الاهتمامات</span>
            </div>
            <span className={getScoreColor(data.details.interests.score)}>
              {Math.round(data.details.interests.score)}%
            </span>
          </div>
          <Progress value={data.details.interests.score} className="h-1.5" />
          {data.details.interests.shared.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.details.interests.shared.map((interest) => (
                <Badge key={interest} variant="outline" className="text-[9px] px-1 py-0">
                  {interest}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* المستوى */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>المستوى</span>
            </div>
            <span className={getScoreColor(data.details.level)}>{Math.round(data.details.level)}%</span>
          </div>
          <Progress value={data.details.level} className="h-1.5" />
        </div>

        {/* الأهداف */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>الأهداف</span>
            </div>
            <span className={getScoreColor(data.details.goal)}>{Math.round(data.details.goal)}%</span>
          </div>
          <Progress value={data.details.goal} className="h-1.5" />
        </div>

        {/* الأسلوب */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>الأسلوب</span>
            </div>
            <span className={getScoreColor(data.details.style)}>{Math.round(data.details.style)}%</span>
          </div>
          <Progress value={data.details.style} className="h-1.5" />
        </div>
      </div>

      {/* ملخص الملف الشخصي */}
      {data.userProfile.goal && (
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">هدف المستخدم:</p>
          <p className="text-sm line-clamp-2">{data.userProfile.goal}</p>
        </div>
      )}

      {data.userProfile.skills && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">المهارات:</p>
          <p className="text-sm line-clamp-2">{data.userProfile.skills}</p>
        </div>
      )}
    </div>
  )
}
