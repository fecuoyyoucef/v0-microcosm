"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Calendar,
  CheckCircle,
  Lightbulb,
  MessageSquare,
  Link2,
  AlertCircle,
  Users,
  ChevronDown,
  Bell,
  Clock,
} from "lucide-react"
import { format, isToday, isYesterday, parseISO } from "date-fns"
import { ar } from "date-fns/locale"
import type { DailySummary, MemoryTrigger } from "@/lib/types"

interface TimelineViewProps {
  summaries: DailySummary[]
  triggers: MemoryTrigger[]
  groupId: string
}

export function TimelineView({ summaries, triggers, groupId }: TimelineViewProps) {
  const [expandedSummary, setExpandedSummary] = useState<string | null>(summaries[0]?.id || null)

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr)
    if (isToday(date)) return "اليوم"
    if (isYesterday(date)) return "أمس"
    return format(date, "EEEE d MMMM yyyy", { locale: ar })
  }

  if (summaries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد ملخصات بعد</p>
          <p className="text-sm mt-2">اضغط على "إنشاء ملخص" لتوليد أول ملخص للمحادثات</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 max-w-3xl mx-auto">
        {/* Memory Triggers */}
        {triggers.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              ذكريات محفزة
            </h3>
            <div className="space-y-2">
              {triggers.map((trigger) => (
                <div key={trigger.id} className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-primary mt-0.5" />
                    <p>{trigger.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-0 bottom-0 right-4 w-px bg-border" />

          <div className="space-y-6">
            {summaries.map((summary) => {
              const decisions = summary.decisions as Array<{ text: string; by?: string }>
              const ideas = summary.ideas as Array<{ text: string; by: string }>
              const topics = summary.topics as Array<{ title: string; summary: string }>
              const links = summary.links as Array<{ url: string; description: string }>
              const pendingItems = summary.pending_items as string[]
              const contributors = summary.contributors as Array<{ name: string; note: string }>

              return (
                <Collapsible
                  key={summary.id}
                  open={expandedSummary === summary.id}
                  onOpenChange={(open) => setExpandedSummary(open ? summary.id : null)}
                >
                  <div className="relative pr-10">
                    {/* Timeline dot */}
                    <div className="absolute right-2 top-4 w-4 h-4 rounded-full bg-primary border-4 border-background" />

                    <Card className="bg-card">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-secondary/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Calendar className="w-5 h-5 text-primary" />
                              <CardTitle className="text-lg">{formatDate(summary.summary_date)}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{summary.raw_message_count} رسالة</Badge>
                              <ChevronDown
                                className={`w-5 h-5 transition-transform ${expandedSummary === summary.id ? "rotate-180" : ""}`}
                              />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-6">
                          {/* Decisions */}
                          {decisions && decisions.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-emerald-600">
                                <CheckCircle className="w-4 h-4" />
                                القرارات المتخذة
                              </h4>
                              <ul className="space-y-1">
                                {decisions.map((decision, i) => (
                                  <li
                                    key={i}
                                    className="text-sm pr-4 relative before:absolute before:right-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-emerald-500"
                                  >
                                    {decision.text}
                                    {decision.by && (
                                      <span className="text-muted-foreground text-xs mr-2">- {decision.by}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Ideas */}
                          {ideas && ideas.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-amber-600">
                                <Lightbulb className="w-4 h-4" />
                                الأفكار الرئيسية
                              </h4>
                              <ul className="space-y-1">
                                {ideas.map((idea, i) => (
                                  <li
                                    key={i}
                                    className="text-sm pr-4 relative before:absolute before:right-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-500"
                                  >
                                    {idea.text}
                                    <span className="text-muted-foreground text-xs mr-2">- اقترحها {idea.by}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Topics */}
                          {topics && topics.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-blue-600">
                                <MessageSquare className="w-4 h-4" />
                                المواضيع المطروحة
                              </h4>
                              <div className="space-y-2">
                                {topics.map((topic, i) => (
                                  <div key={i} className="p-2 rounded bg-secondary/50">
                                    <p className="font-medium text-sm">{topic.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{topic.summary}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Links */}
                          {links && links.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-violet-600">
                                <Link2 className="w-4 h-4" />
                                الروابط المشاركة
                              </h4>
                              <ul className="space-y-1">
                                {links.map((link, i) => (
                                  <li key={i} className="text-sm">
                                    <a
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      {link.description || link.url}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Pending Items */}
                          {pendingItems && pendingItems.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-orange-600">
                                <AlertCircle className="w-4 h-4" />
                                نقاط معلقة
                              </h4>
                              <ul className="space-y-1">
                                {pendingItems.map((item, i) => (
                                  <li
                                    key={i}
                                    className="text-sm pr-4 relative before:absolute before:right-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-orange-500"
                                  >
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Contributors */}
                          {contributors && contributors.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-pink-600">
                                <Users className="w-4 h-4" />
                                أبرز المساهمين
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {contributors.map((contributor, i) => (
                                  <Badge key={i} variant="outline" className="bg-transparent">
                                    {contributor.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </div>
                </Collapsible>
              )
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
