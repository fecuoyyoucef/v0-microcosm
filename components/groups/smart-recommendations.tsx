"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Users, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

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
  const [selectedCell, setSelectedCell] = useState<Recommendation | null>(null)
  const [isJoining, setIsJoining] = useState(false)

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

  const handleJoinCell = async (rec: Recommendation) => {
    setIsJoining(true)
    try {
      const response = await fetch("/api/groups/join-cell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: rec.id }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.type === "joined") {
          setSelectedCell(null)
          setRecommendations((prev) => prev.filter((r) => r.id !== rec.id))
          // Show success message
          alert(`تم الانضمام إلى ${rec.title} بنجاح!`)
        } else if (data.type === "request_submitted") {
          setSelectedCell(null)
          setRecommendations((prev) => prev.filter((r) => r.id !== rec.id))
          // Show request submitted message
          alert(`تم تقديم طلب الانضمام إلى ${rec.title}. سيتم مراجعته من قبل مسؤول الخلية.`)
        }
      } else {
        alert(data.error || "فشل في معالجة الطلب")
      }
    } catch (error) {
      console.error("Join error:", error)
      alert("حدث خطأ في معالجة طلبك")
    } finally {
      setIsJoining(false)
    }
  }

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
    <>
      <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            توصيات ذكية لك
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recommendations.map(
            (rec) =>
              rec.id &&
              rec.type === "cell" && (
                <button
                  key={rec.id}
                  onClick={() => setSelectedCell(rec)}
                  className="w-full text-left p-3 rounded-lg bg-card hover:bg-card/80 transition-colors border border-border/50 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
                      <Users className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{rec.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                    </div>
                    {rec.score && !isNaN(rec.score) && (
                      <div className="text-xs font-medium text-amber-600 shrink-0">{Math.round(rec.score)}%</div>
                    )}
                  </div>
                </button>
              ),
          )}
        </CardContent>
      </Card>

      {selectedCell && (
        <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedCell.title}</DialogTitle>
              <DialogDescription>{selectedCell.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">{selectedCell.reason}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCell(null)}>
                إلغاء
              </Button>
              <Button onClick={() => handleJoinCell(selectedCell)} disabled={isJoining}>
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    جاري المعالجة...
                  </>
                ) : (
                  "الانضمام للخلية"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
