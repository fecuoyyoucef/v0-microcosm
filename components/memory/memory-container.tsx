"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Hash, Calendar, Search, BarChart3, Sparkles } from "lucide-react"
import Link from "next/link"
import type { Group, DailySummary, MemoryTrigger } from "@/lib/types"
import { TimelineView } from "./timeline-view"
import { SearchView } from "./search-view"
import { StatsView } from "./stats-view"
import { GenerateSummaryDialog } from "./generate-summary-dialog"

interface MemoryContainerProps {
  groupId: string
  group: Group
  summaries: DailySummary[]
  triggers: MemoryTrigger[]
  currentUserId: string
}

export function MemoryContainer({ groupId, group, summaries, triggers, currentUserId }: MemoryContainerProps) {
  const [activeTab, setActiveTab] = useState("timeline")
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border px-4 flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-3">
          <Link href={`/chat/${groupId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-primary" />
            <span className="font-medium">{group.name}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">الذاكرة المشتركة</span>
          </div>
        </div>

        <Button size="sm" onClick={() => setIsGenerateOpen(true)}>
          <Sparkles className="w-4 h-4 ml-2" />
          إنشاء ملخص
        </Button>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-card/30">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="timeline" className="gap-2">
              <Calendar className="w-4 h-4" />
              الجدول الزمني
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="w-4 h-4" />
              البحث
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              الإحصائيات
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="timeline" className="flex-1 overflow-hidden m-0">
          <TimelineView summaries={summaries} triggers={triggers} groupId={groupId} />
        </TabsContent>

        <TabsContent value="search" className="flex-1 overflow-hidden m-0">
          <SearchView groupId={groupId} />
        </TabsContent>

        <TabsContent value="stats" className="flex-1 overflow-hidden m-0">
          <StatsView summaries={summaries} groupId={groupId} />
        </TabsContent>
      </Tabs>

      <GenerateSummaryDialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen} groupId={groupId} />
    </div>
  )
}
