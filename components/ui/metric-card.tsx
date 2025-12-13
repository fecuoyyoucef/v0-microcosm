"use client"

import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: number
  size?: "sm" | "md"
}

export function MetricCard({ label, value, size = "sm" }: MetricCardProps) {
  const getMetricColor = (val: number) => {
    if (val > 90) return "bg-blue-500/30 border-blue-500/50 text-blue-300"
    if (val >= 75) return "bg-green-500/30 border-green-500/50 text-green-300"
    if (val >= 50) return "bg-yellow-500/30 border-yellow-500/50 text-yellow-300"
    if (val >= 25) return "bg-orange-500/30 border-orange-500/50 text-orange-300"
    return "bg-red-500/30 border-red-500/50 text-red-300"
  }

  return (
    <div
      className={cn(
        "border rounded-lg backdrop-blur-sm flex flex-col items-center justify-center font-medium",
        getMetricColor(value),
        size === "sm" ? "px-2.5 py-1.5 text-[10px] gap-0.5" : "px-4 py-3 text-sm gap-1",
      )}
    >
      <div className={cn("font-bold", size === "sm" ? "text-sm" : "text-2xl")}>{value}%</div>
      <div className={cn(size === "sm" ? "text-[9px]" : "text-xs")}>{label}</div>
    </div>
  )
}
