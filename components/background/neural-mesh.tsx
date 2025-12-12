"use client"

import { useEffect, useRef } from "react"

interface NeuralMeshProps {
  disabled?: boolean
}

export function NeuralMesh({ disabled = false }: NeuralMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    console.log("[v0] NeuralMesh component mounted")

    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion || disabled) {
      console.log("[v0] NeuralMesh disabled due to user preference or prop")
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      console.log("[v0] Canvas ref not available")
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      console.log("[v0] Canvas context not available")
      return
    }

    console.log("[v0] NeuralMesh starting animation")

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setCanvasSize()
    window.addEventListener("resize", setCanvasSize)

    // Neural nodes
    const nodes: Array<{
      x: number
      y: number
      vx: number
      vy: number
      baseX: number
      baseY: number
    }> = []

    const gridSize = 120
    for (let x = 0; x < canvas.width; x += gridSize) {
      for (let y = 0; y < canvas.height; y += gridSize) {
        nodes.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
          baseX: x,
          baseY: y,
        })
      }
    }

    let pulsePhase = 0
    let lastTime = Date.now()

    const animate = () => {
      const currentTime = Date.now()
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update pulse phase (8-12 second cycle)
      pulsePhase += deltaTime / 10000

      const pulseOpacity = 0.08 + Math.sin(pulsePhase) * 0.035

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

          if (dist < 220) {
            const opacity = (1 - dist / 220) * pulseOpacity
            ctx.strokeStyle = `rgba(0, 200, 200, ${opacity})`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
          }
        }

        // Draw node
        ctx.fillStyle = `rgba(0, 220, 220, ${pulseOpacity * 3})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2)
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
      style={{ opacity: 0.6 }}
      aria-hidden="true"
    />
  )
}
