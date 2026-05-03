"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface NeuralMeshProps {
  className?: string
  density?: number
  speed?: number
}

/**
 * Animated neural mesh background
 * Renders connected nodes that drift slowly and pulse —
 * the visual signature of Synaptic Space
 */
export function NeuralMesh({ className, density = 18, speed = 0.3 }: NeuralMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let rafId = 0

    type Node = { x: number; y: number; vx: number; vy: number; radius: number; tier: number }
    let nodes: Node[] = []

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
    }

    const init = () => {
      nodes = []
      for (let i = 0; i < density; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          radius: 1.5 + Math.random() * 2,
          tier: Math.floor(Math.random() * 3),
        })
      }
    }

    const getColor = (tier: number, alpha = 1) => {
      // Read from CSS vars for theme support
      const isDark = document.documentElement.classList.contains("dark")
      if (tier === 0) {
        // Saffron / accent
        return isDark
          ? `oklch(0.78 0.16 70 / ${alpha})`
          : `oklch(0.72 0.16 65 / ${alpha})`
      }
      if (tier === 1) {
        // Teal / primary
        return isDark
          ? `oklch(0.7 0.14 195 / ${alpha})`
          : `oklch(0.55 0.13 195 / ${alpha})`
      }
      // Muted
      return isDark
        ? `oklch(0.7 0.16 165 / ${alpha})`
        : `oklch(0.62 0.15 165 / ${alpha})`
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      // Update node positions
      for (const node of nodes) {
        node.x += node.vx
        node.y += node.vy
        if (node.x < 0 || node.x > width) node.vx *= -1
        if (node.y < 0 || node.y > height) node.vy *= -1
      }

      // Draw connections
      const maxDist = Math.min(width, height) * 0.22
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.25
            ctx.strokeStyle = getColor(a.tier, alpha)
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Draw nodes with glow
      for (const node of nodes) {
        // Outer glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 4)
        gradient.addColorStop(0, getColor(node.tier, 0.4))
        gradient.addColorStop(1, getColor(node.tier, 0))
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius * 4, 0, Math.PI * 2)
        ctx.fill()

        // Core
        ctx.fillStyle = getColor(node.tier, 0.85)
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      rafId = requestAnimationFrame(draw)
    }

    resize()
    init()
    draw()

    const resizeHandler = () => {
      resize()
      init()
    }
    window.addEventListener("resize", resizeHandler)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resizeHandler)
    }
  }, [density, speed])

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 h-full w-full", className)}
      aria-hidden="true"
    />
  )
}
