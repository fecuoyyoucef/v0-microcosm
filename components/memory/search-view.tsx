"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Loader2, Calendar, MessageSquare } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ar } from "date-fns/locale"
import type { DailySummary } from "@/lib/types"

interface SearchViewProps {
  groupId: string
}

export function SearchView({ groupId }: SearchViewProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<DailySummary[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const supabase = createClient()

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      // بحث في الملخصات
      const { data } = await supabase
        .from("daily_summaries")
        .select("*")
        .eq("group_id", groupId)
        .or(
          `decisions.cs.{"text":"${query}"},ideas.cs.{"text":"${query}"},topics.cs.{"title":"${query}"},topics.cs.{"summary":"${query}"}`,
        )
        .order("summary_date", { ascending: false })
        .limit(20)

      setResults(data || [])
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text
    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"))
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search Input */}
      <div className="p-4 border-b border-border bg-card/50">
        <div className="max-w-2xl mx-auto flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ابحث في الذاكرة... (مثال: متى قررنا موعد الرحلة؟)"
              className="pr-10 bg-background"
            />
          </div>
          <Button onClick={handleSearch} disabled={!query.trim() || isSearching}>
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "بحث"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          ابحث عن القرارات، الأفكار، المواضيع، أو أي محتوى في الملخصات السابقة
        </p>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-2xl mx-auto">
          {!hasSearched ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>ابحث في ذاكرة المجموعة</p>
              <p className="text-sm mt-2">يمكنك البحث بالمعنى وليس بالكلمات فقط</p>
            </div>
          ) : isSearching ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-4">جاري البحث...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لم يتم العثور على نتائج</p>
              <p className="text-sm mt-2">جرّب كلمات بحث مختلفة</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">تم العثور على {results.length} نتيجة</p>
              {results.map((summary) => {
                const decisions = summary.decisions as Array<{ text: string; by?: string }>
                const ideas = summary.ideas as Array<{ text: string; by: string }>
                const topics = summary.topics as Array<{ title: string; summary: string }>

                return (
                  <Card key={summary.id} className="bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Calendar className="w-4 h-4" />
                        <span>{format(parseISO(summary.summary_date), "d MMMM yyyy", { locale: ar })}</span>
                      </div>

                      <div className="space-y-3">
                        {decisions?.map((d, i) => (
                          <p key={`d-${i}`} className="text-sm">
                            <span className="text-emerald-600 font-medium">قرار: </span>
                            {highlightMatch(d.text, query)}
                          </p>
                        ))}
                        {ideas?.map((idea, i) => (
                          <p key={`i-${i}`} className="text-sm">
                            <span className="text-amber-600 font-medium">فكرة: </span>
                            {highlightMatch(idea.text, query)}
                          </p>
                        ))}
                        {topics?.map((topic, i) => (
                          <p key={`t-${i}`} className="text-sm">
                            <span className="text-blue-600 font-medium">موضوع: </span>
                            {highlightMatch(topic.title, query)} - {highlightMatch(topic.summary, query)}
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
