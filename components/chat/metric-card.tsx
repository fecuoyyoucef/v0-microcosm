"use client"

import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: number
  size?: "sm" | "md"
}

export function MetricCard({ label, value, size = "sm" }: MetricCardProps) {
  const getMetricColor = (val: number) => {
    if (val > 90) return "bg-blue-500/20 border-blue-500/30 text-blue-400"
    if (val >= 75) return "bg-green-500/20 border-green-500/30 text-green-400"
    if (val >= 50) return "bg-yellow-500/20 border-yellow-500/30 text-yellow-400"
    if (val >= 25) return "bg-orange-500/20 border-orange-500/30 text-orange-400"
    return "bg-red-500/20 border-red-500/30 text-red-400"
  }

  return (
    <div
      className={cn(
        "border rounded-xl backdrop-blur-sm flex flex-col items-center justify-center",
        getMetricColor(value),
        size === "sm" ? "px-3 py-2 text-center" : "px-4 py-3 text-center",
      )}
    >
      <div className={cn("font-bold", size === "sm" ? "text-lg" : "text-2xl")}>{value}%</div>
      <div className={cn("font-medium mt-1", size === "sm" ? "text-[10px]" : "text-xs")}>{label}</div>
    </div>
  )
}
