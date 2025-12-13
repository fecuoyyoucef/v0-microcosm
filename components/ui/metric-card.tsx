"use client"

import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: number
  size?: "sm" | "md"
  onClick?: () => void
}

export function MetricCard({ label, value, size = "sm", onClick }: MetricCardProps) {
  const getMetricColor = (val: number) => {
    if (val > 90) return "bg-blue-500/30 border-blue-500/50 text-blue-300"
    if (val >= 75) return "bg-green-500/30 border-green-500/50 text-green-300"
    if (val >= 50) return "bg-yellow-500/30 border-yellow-500/50 text-yellow-300"
    if (val >= 25) return "bg-orange-500/30 border-orange-500/50 text-orange-300"
    return "bg-red-500/30 border-red-500/50 text-red-300"
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "border rounded-lg backdrop-blur-sm flex flex-col items-center justify-center font-medium transition-all",
        getMetricColor(value),
        size === "sm"
          ? "px-3 py-2 text-[11px] gap-0.5 min-w-[60px] cursor-pointer hover:opacity-80"
          : "px-4 py-3 text-sm gap-1",
      )}
    >
      {size === "sm" ? (
        <div className="text-[11px] font-semibold">{label}</div>
      ) : (
        <>
          <div className={cn("font-bold", size === "md" ? "text-2xl" : "text-lg")}>{value}%</div>
          <div className="text-xs">{label}</div>
        </>
      )}
    </div>
  )
}
