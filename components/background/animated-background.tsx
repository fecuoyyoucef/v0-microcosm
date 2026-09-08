"use client"

import { useEffect, useState } from "react"

export type BackgroundStyle =
  | "neural_mesh"
  | "neural_network"
  | "matrix_code"
  | "neuron_cell"
  | "aurora"
  | "ocean_depth"
  | "paper_grid"
  | "sunset_glow"
  | "none"

interface AnimatedBackgroundProps {
  style: BackgroundStyle
}

export function AnimatedBackground({ style }: AnimatedBackgroundProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || style === "none") return null

  const getBackgroundImage = () => {
    switch (style) {
      case "neural_network":
        return "/images/img-20251213-000052.jpg"
      case "matrix_code":
        return "/images/img-20251212-235955.jpg"
      case "neuron_cell":
        return "/images/img-20251213-000739.jpg"
      default:
        return null
    }
  }

  const backgrounds: Record<BackgroundStyle, { image?: string; className?: string }> = {
    neural_mesh: { className: "bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/.22),transparent_32%),radial-gradient(circle_at_80%_70%,hsl(var(--accent)/.18),transparent_36%)]" },
    neural_network: { image: "/images/img-20251213-000052.jpg" },
    matrix_code: { image: "/images/img-20251212-235955.jpg" },
    neuron_cell: { image: "/images/img-20251213-000739.jpg" },
    aurora: { className: "bg-[radial-gradient(ellipse_at_top,hsl(175_70%_38%/.32),transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(215_70%_42%/.28),transparent_58%)]" },
    ocean_depth: { className: "bg-[linear-gradient(145deg,hsl(190_55%_18%),hsl(215_50%_10%)_58%,hsl(175_55%_20%))]" },
    paper_grid: { className: "bg-[linear-gradient(hsl(var(--border)/.18)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/.18)_1px,transparent_1px)] bg-[size:28px_28px]" },
    sunset_glow: { className: "bg-[radial-gradient(circle_at_70%_25%,hsl(35_85%_54%/.28),transparent_38%),linear-gradient(145deg,hsl(220_35%_12%),hsl(345_45%_18%))]" },
    none: {},
  }
  const selected = backgrounds[style]

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {selected.image && <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 blur-[4px]" style={{ backgroundImage: `url(${selected.image})` }} />}
      {selected.className && <div className={`absolute inset-0 ${selected.className}`} />}
      <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/35 to-background/65" />
    </div>
  )
}
