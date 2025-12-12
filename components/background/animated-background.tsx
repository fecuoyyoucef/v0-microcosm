"use client"

import { useEffect, useState } from "react"

export type BackgroundStyle = "neural_mesh" | "neural_network" | "matrix_code" | "neuron_cell" | "none"

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

  const backgroundImage = getBackgroundImage()

  if (!backgroundImage) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-pulse-slow"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          filter: "blur(4px)",
          opacity: 0.4,
          animationDuration: "10s",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/60" />
    </div>
  )
}
