"use client"

import { useEffect, useRef } from "react"

interface NeuralMeshProps {
  disabled?: boolean
}

export function NeuralMesh({ disabled = false }: NeuralMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion || disabled) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      return
    }

    const isDark = document.documentElement.classList.contains("dark")

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setCanvasSize()
    window.addEventListener("resize", setCanvasSize)

    const gridSize = 80
    const nodes: Array<{
      x: number
      y: number
      vx: number
      vy: number
      baseX: number
      baseY: number
      pulse: number
    }> = []

    for (let x = 0; x < canvas.width; x += gridSize) {
      for (let y = 0; y < canvas.height; y += gridSize) {
        nodes.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.1,
          vy: (Math.random() - 0.5) * 0.1,
          baseX: x,
          baseY: y,
          pulse: Math.random() * Math.PI * 2, // Individual pulse for each node
        })
      }
    }

    let globalPhase = 0
    let lastTime = Date.now()

    const animate = () => {
      const currentTime = Date.now()
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update global phase
      globalPhase += deltaTime / 8000

      const nodeColorDark = isDark ? [0, 220, 220] : [50, 100, 180]
      const nodeColorLight = isDark ? [100, 200, 200] : [100, 150, 220]
      const lineColorDark = isDark ? [0, 180, 180] : [80, 130, 200]

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Drift nodes slightly
        node.x += node.vx
        node.y += node.vy

        // Gentle spring force to return to base position
        const dx = node.baseX - node.x
        const dy = node.baseY - node.y
        node.vx += dx * 0.002
        node.vy += dy * 0.002

        // Damping
        node.vx *= 0.97
        node.vy *= 0.97

        // Draw connections to nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j]
          const dist = Math.hypot(node.x - other.x, node.y - other.y)

          if (dist < 280) {
            const opacity = (1 - dist / 280) * 0.25 // Increased from 0.08 to 0.25
            ctx.strokeStyle = `rgba(${lineColorDark[0]}, ${lineColorDark[1]}, ${lineColorDark[2]}, ${opacity})`
            ctx.lineWidth = 1.2 // Increased from 0.8 to 1.2
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
          }
        }

        const nodePulse = 0.15 + Math.sin(globalPhase * 2 + node.pulse) * 0.08

        // Draw outer glow
        ctx.fillStyle = `rgba(${nodeColorLight[0]}, ${nodeColorLight[1]}, ${nodeColorLight[2]}, ${nodePulse * 0.4})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, 5, 0, Math.PI * 2)
        ctx.fill()

        // Draw main node
        ctx.fillStyle = `rgba(${nodeColorDark[0]}, ${nodeColorDark[1]}, ${nodeColorDark[2]}, ${nodePulse})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2)
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", setCanvasSize)
    }
  }, [disabled])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.8 }}
      aria-hidden="true"
    />
  )
}
