"use client"

import { useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Lightbulb, MessageSquare, TrendingUp, Calendar, Users } from "lucide-react"
import type { DailySummary } from "@/lib/types"

interface StatsViewProps {
  summaries: DailySummary[]
  groupId: string
}

export function StatsView({ summaries, groupId }: StatsViewProps) {
  const stats = useMemo(() => {
    let totalDecisions = 0
    let totalIdeas = 0
    let totalTopics = 0
    let totalMessages = 0
    const contributorCounts: Record<string, number> = {}

    summaries.forEach((summary) => {
      const decisions = summary.decisions as Array<{ text: string }>
      const ideas = summary.ideas as Array<{ text: string; by: string }>
      const topics = summary.topics as Array<{ title: string }>
      const contributors = summary.contributors as Array<{ name: string }>

      totalDecisions += decisions?.length || 0
      totalIdeas += ideas?.length || 0
      totalTopics += topics?.length || 0
      totalMessages += summary.raw_message_count

      contributors?.forEach((c) => {
        contributorCounts[c.name] = (contributorCounts[c.name] || 0) + 1
      })
    })

    const topContributors = Object.entries(contributorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    return {
      totalDecisions,
      totalIdeas,
      totalTopics,
      totalMessages,
      totalSummaries: summaries.length,
      topContributors,
      averageMessagesPerDay: summaries.length > 0 ? Math.round(totalMessages / summaries.length) : 0,
    }
  }, [summaries])

  if (summaries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد بيانات كافية للإحصائيات</p>
          <p className="text-sm mt-2">أنشئ ملخصات للمحادثات لرؤية الإحصائيات</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalDecisions}</p>
                  <p className="text-sm text-muted-foreground">قرار</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalIdeas}</p>
                  <p className="text-sm text-muted-foreground">فكرة</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalTopics}</p>
                  <p className="text-sm text-muted-foreground">موضوع</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-violet-500/10 border-violet-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalSummaries}</p>
                  <p className="text-sm text-muted-foreground">ملخص</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Activity Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                نظرة عامة على النشاط
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                <span className="text-sm">إجمالي الرسائل</span>
                <span className="font-bold">{stats.totalMessages.toLocaleString("ar")}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                <span className="text-sm">متوسط الرسائل اليومي</span>
                <span className="font-bold">{stats.averageMessagesPerDay.toLocaleString("ar")}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                <span className="text-sm">أيام الملخصات</span>
                <span className="font-bold">{stats.totalSummaries}</span>
              </div>
            </CardContent>
          </Card>

          {/* Top Contributors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                أكثر المساهمين نشاطاً
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topContributors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
              ) : (
                <div className="space-y-3">
                  {stats.topContributors.map((contributor, index) => (
                    <div key={contributor.name} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? "bg-amber-500/20 text-amber-600"
                            : index === 1
                              ? "bg-slate-400/20 text-slate-600"
                              : index === 2
                                ? "bg-orange-600/20 text-orange-700"
                                : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{contributor.name}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{contributor.count} مرة</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  )
}
