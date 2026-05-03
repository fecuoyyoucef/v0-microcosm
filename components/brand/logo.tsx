import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: number
  variant?: "default" | "mark" | "wordmark"
  animated?: boolean
}

/**
 * Synaptic Space Logo
 * Symbolizes neural connections — three nodes (mind/heart/voice) connected by synaptic paths
 * Maps to the three temporal layers: upper / standard / shadow
 */
export function Logo({ className, size = 40, variant = "default", animated = false }: LogoProps) {
  if (variant === "mark") {
    return <LogoMark className={className} size={size} animated={animated} />
  }

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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={cn("shrink-0", className)}
      aria-label="Synaptic Space"
    >
      {/* Soft glow background */}
      <circle cx="20" cy="20" r="19" className="fill-primary/8" />

      {/* Connection paths - synaptic threads */}
      <path
        d="M12 13 Q20 10 28 13"
        className={cn("stroke-primary/60", animated && "neural-flow")}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M12 13 Q15 22 28 27"
        className={cn("stroke-primary/40", animated && "neural-flow")}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M28 13 Q25 22 12 27"
        className={cn("stroke-accent/50", animated && "neural-flow")}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M12 27 Q20 30 28 27"
        className={cn("stroke-primary/30", animated && "neural-flow")}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Three nodes - representing the three layers */}
      {/* Upper layer node - saffron */}
      <circle
        cx="20"
        cy="9"
        r="3.5"
        className={cn("fill-accent", animated && "neural-pulse")}
      />
      <circle cx="20" cy="9" r="1.5" className="fill-background" />

      {/* Standard layer node - teal (primary) */}
      <circle
        cx="11"
        cy="20"
        r="3"
        className={cn("fill-primary", animated && "neural-pulse")}
        style={animated ? { animationDelay: "1s" } : undefined}
      />
      <circle cx="11" cy="20" r="1.2" className="fill-background" />

      {/* Shadow layer node - muted */}
      <circle
        cx="29"
        cy="20"
        r="3"
        className={cn("fill-primary/70", animated && "neural-pulse")}
        style={animated ? { animationDelay: "2s" } : undefined}
      />
      <circle cx="29" cy="20" r="1.2" className="fill-background" />

      {/* Center hub - the synapse */}
      <circle cx="20" cy="29" r="2" className="fill-foreground/80" />
    </svg>
  )
}
