"use client"

import { useMemo, useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, TrendingUp, Activity } from "lucide-react"
import type { Group } from "@/lib/types"
import { cn } from "@/lib/utils"

interface GroupMetricsDisplayProps {
  group: Group
  className?: string
}

export function GroupMetricsDisplay({ group, className }: GroupMetricsDisplayProps) {
  const [metricsEnabled, setMetricsEnabled] = useState(false)

  const isProject = group.cell_category === "project"
  const responsibilityScore = group.responsibility_score ?? 100
  const progressScore = group.progress_score ?? 0

  useEffect(() => {
    import("@/lib/system-settings").then((mod) => {
      mod.getSystemSetting("metrics_enabled").then(setMetricsEnabled)
    })
  }, [])

  const responsibilityStatus = useMemo(() => {
    if (responsibilityScore >= 75) return { label: "ممتاز", color: "text-green-500", bg: "bg-green-500/10" }
    if (responsibilityScore >= 60) return { label: "جيد", color: "text-blue-500", bg: "bg-blue-500/10" }
    if (responsibilityScore >= 40) return { label: "تحذير", color: "text-yellow-500", bg: "bg-yellow-500/10" }
    return { label: "خطر", color: "text-red-500", bg: "bg-red-500/10" }
  }, [responsibilityScore])

  const progressStatus = useMemo(() => {
    if (progressScore >= 75) return { label: "متقدم", color: "text-green-500" }
    if (progressScore >= 50) return { label: "متوسط", color: "text-blue-500" }
    if (progressScore >= 25) return { label: "بطيء", color: "text-yellow-500" }
    return { label: "راكد", color: "text-red-500" }
  }, [progressScore])

  if (!metricsEnabled) {
    return null
  }

  if (!isProject && responsibilityScore >= 75) {
    // Don't show metrics for discussion cells with good responsibility
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Responsibility Score */}
      <Card className={cn("p-4", responsibilityStatus.bg)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className={cn("h-4 w-4", responsibilityStatus.color)} />
            <span className="text-sm font-medium">معيار المسؤولية</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-lg font-bold", responsibilityStatus.color)}>{responsibilityScore}%</span>
            <span className={cn("text-xs font-medium px-2 py-1 rounded", responsibilityStatus.bg)}>
              {responsibilityStatus.label}
            </span>
          </div>
        </div>
        <Progress value={responsibilityScore} className="h-2" />
        {responsibilityScore < 60 && (
          <div className="flex items-start gap-2 mt-3 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <p>
              {responsibilityScore < 40
                ? "الخلية في خطر! بعض الخدمات قد تُحظر قريباً."
                : "انتبه: معيار المسؤولية منخفض. حافظ على النشاط المنتظم."}
            </p>
          </div>
        )}
      </Card>

      {/* Progress Score - Only for project cells */}
      {isProject && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className={cn("h-4 w-4", progressStatus.color)} />
              <span className="text-sm font-medium">معيار التقدم</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-lg font-bold", progressStatus.color)}>{progressScore}%</span>
              <span className={cn("text-xs font-medium px-2 py-1 rounded bg-muted")}>{progressStatus.label}</span>
            </div>
          </div>
          <Progress value={progressScore} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            يُحسب بناءً على القرارات المتخذة والعقود المكتملة والنشاط العام
          </p>
        </Card>
      )}
    </div>
  )
}
