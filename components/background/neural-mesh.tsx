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
    if (prefersReducedMotion || disabled) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

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

    // Create a sparse grid of nodes (much fewer nodes for better performance)
    const gridSize = 150 // Increased spacing between nodes
    for (let x = 0; x < canvas.width; x += gridSize) {
      for (let y = 0; y < canvas.height; y += gridSize) {
        nodes.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.05, // Very slow movement
          vy: (Math.random() - 0.5) * 0.05,
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
      pulsePhase += deltaTime / 10000 // Very slow pulse

      // Calculate pulse opacity (0.02 to 0.06 - very subtle)
      const pulseOpacity = 0.02 + Math.sin(pulsePhase) * 0.02

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Drift nodes slightly, but keep them tethered to their base position
        node.x += node.vx
        node.y += node.vy

        // Gentle spring force to return to base position
        const dx = node.baseX - node.x
        const dy = node.baseY - node.y
        node.vx += dx * 0.001
        node.vy += dy * 0.001

        // Damping
        node.vx *= 0.98
        node.vy *= 0.98

        // Draw connections to nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j]
          const dist = Math.hypot(node.x - other.x, node.y - other.y)

          // Only connect nodes within 200px
          if (dist < 200) {
            const opacity = (1 - dist / 200) * pulseOpacity
            ctx.strokeStyle = `rgba(100, 100, 255, ${opacity})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
          }
        }

        // Draw node
        ctx.fillStyle = `rgba(150, 150, 255, ${pulseOpacity * 2})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2)
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
      style={{ opacity: 0.4 }}
      aria-hidden="true"
    />
  )
}
