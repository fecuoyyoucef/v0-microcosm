import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: number
  variant?: "default" | "mark" | "wordmark"
  animated?: boolean
}

/**
 * Synaptic Space Logo
 * Uses the existing brand icon at /public/icon.svg
 */
export function Logo({ className, size = 40, variant = "default", animated = false }: LogoProps) {
  if (variant === "wordmark") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <LogoMark size={size} animated={animated} />
        <span className="font-heading text-xl font-semibold tracking-tight">Synaptic</span>
      </div>
    )
  }

  return <LogoMark className={className} size={size} animated={animated} />
}

function LogoMark({
  className,
  size = 40,
  animated = false,
}: {
  className?: string
  size?: number
  animated?: boolean
}) {
  return (
    <Image
      src="/icon.svg"
      alt="Synaptic"
      width={size}
      height={size}
      priority
      className={cn("shrink-0 select-none", animated && "neural-pulse", className)}
    />
  )
}
