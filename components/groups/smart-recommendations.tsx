"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, TrendingUp, Users, MessageSquare, Loader2 } from "lucide-react"
import Link from "next/link"

interface Recommendation {
  type: "cell" | "node" | "user"
  id: string
  title: string
  description: string
  score: number
  reason: string
}

interface SmartRecommendationsProps {
  userId: string
}

export function SmartRecommendations({ userId }: SmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch("/api/ai/recommend-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, limit: 3 }),
        })

        if (response.ok) {
          const data = await response.json()
          setRecommendations(data.recommendations || [])
        }
      } catch (error) {
        console.error("Failed to fetch recommendations:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendations()
  }, [userId])

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) return null

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          توصيات ذكية لك
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recommendations.map((rec) => (
          <Link key={rec.id} href={rec.type === "cell" ? `/chat/${rec.id}` : `/chat/${rec.id}/nodes`} className="block">
            <div className="p-3 rounded-lg bg-card hover:bg-card/80 transition-colors border border-border/50">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
                  {rec.type === "cell" && <Users className="w-4 h-4 text-amber-600" />}
                  {rec.type === "node" && <MessageSquare className="w-4 h-4 text-amber-600" />}
                  {rec.type === "user" && <TrendingUp className="w-4 h-4 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                </div>
                <div className="text-xs font-medium text-amber-600 shrink-0">{Math.round(rec.score)}%</div>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
