"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Plus, Trash2, Loader2, ThumbsUp, ListTodo, CheckCircle2, Lock } from "lucide-react"
import type { NotebookPage, GroupMember, NotebookContribution } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface ListPageProps {
  page: NotebookPage
  members: GroupMember[]
  currentUserId: string
}

interface ListItem {
  text: string
  completed: boolean
  votes: string[]
}

type FilterMode = "all" | "active" | "completed"

export function ListPage({ page, members, currentUserId }: ListPageProps) {
  const [contributions, setContributions] = useState<NotebookContribution[]>([])
  const [newItem, setNewItem] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>("all")
  const supabase = createClient()

  const fetchContributions = useCallback(async () => {
    const { data } = await supabase
      .from("notebook_contributions")
      .select("*, contributor:profiles(*)")
      .eq("page_id", page.id)
      .order("position", { ascending: true })

    if (data) {
      setContributions(data)
    }
    setIsLoading(false)
  }, [page.id, supabase])

  useEffect(() => {
    fetchContributions()

    const channel = supabase
      .channel(`list-page-${page.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notebook_contributions",
          filter: `page_id=eq.${page.id}`,
        },
        () => {
          fetchContributions()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [page.id, fetchContributions, supabase])

  const addItem = async () => {
    if (!newItem.trim() || page.is_locked) return

    setIsAdding(true)
    try {
      await supabase.from("notebook_contributions").insert({
        page_id: page.id,
        user_id: currentUserId,
        content: { text: newItem.trim(), completed: false, votes: [] },
        // الترتيب يعتمد على created_at — نتجنّب إسناد position يدوياً لمنع التضارب
      })

      setNewItem("")
    } finally {
      setIsAdding(false)
    }
  }

  // قراءة-تعديل-كتابة آمنة: نجلب أحدث محتوى قبل التحديث
  // لتقليل ضياع الأصوات/حالة الإكمال عند التحرير المتزامن
  const toggleComplete = async (contribution: NotebookContribution) => {
    if (page.is_locked) return

    const { data: fresh } = await supabase
      .from("notebook_contributions")
      .select("content")
      .eq("id", contribution.id)
      .single()

    const latest = (fresh?.content ?? contribution.content) as unknown as ListItem
    await supabase
      .from("notebook_contributions")
      .update({
        content: { ...latest, completed: !latest.completed },
      })
      .eq("id", contribution.id)
  }

  const toggleVote = async (contribution: NotebookContribution) => {
    if (page.is_locked) return

    const { data: fresh } = await supabase
      .from("notebook_contributions")
      .select("content")
      .eq("id", contribution.id)
      .single()

    const latest = (fresh?.content ?? contribution.content) as unknown as ListItem
    const votes = latest.votes || []
    const hasVoted = votes.includes(currentUserId)

    await supabase
      .from("notebook_contributions")
      .update({
        content: {
          ...latest,
          votes: hasVoted ? votes.filter((v) => v !== currentUserId) : [...votes, currentUserId],
        },
      })
      .eq("id", contribution.id)
  }

  const deleteItem = async (id: string) => {
    if (page.is_locked) return
    await supabase.from("notebook_contributions").delete().eq("id", id)
  }

  const getMember = (userId: string) => members.find((m) => m.user_id === userId)

  const stats = useMemo(() => {
    const total = contributions.length
    const completed = contributions.filter((c) => (c.content as unknown as ListItem).completed).length
    return {
      total,
      completed,
      pending: total - completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [contributions])

  const filteredContributions = useMemo(() => {
    if (filter === "all") return contributions
    return contributions.filter((c) => {
      const completed = (c.content as unknown as ListItem).completed
      return filter === "completed" ? completed : !completed
    })
  }, [contributions, filter])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="px-4 md:px-8 py-6 max-w-2xl mx-auto">
          {/* Hero with Progress */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <ListTodo className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold leading-tight text-balance">{page.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.completed} من {stats.total} مكتمل
                  {page.is_locked && (
                    <span className="inline-flex items-center gap-1 mr-2 text-warning-foreground">
                      <Lock className="w-3 h-3" /> مقفلة
                    </span>
                  )}
                </p>
              </div>
              <div className="text-end shrink-0">
                <p className="text-2xl font-bold tabular-nums">{stats.progress}%</p>
                <p className="text-[11px] text-muted-foreground">مكتمل</p>
              </div>
            </div>

            {stats.total > 0 && <Progress value={stats.progress} className="h-2" />}

            {/* Filter chips */}
            {stats.total > 0 && (
              <div className="flex items-center gap-1.5 mt-4">
                {(["all", "active", "completed"] as FilterMode[]).map((mode) => {
                  const isActive = filter === mode
                  const counts = { all: stats.total, active: stats.pending, completed: stats.completed }
                  const labels = { all: "الكل", active: "قيد التنفيذ", completed: "مكتمل" }
                  return (
                    <button
                      key={mode}
                      onClick={() => setFilter(mode)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
                      )}
                    >
                      {labels[mode]}
                      <span className={cn("mr-1.5 tabular-nums", isActive ? "opacity-90" : "opacity-60")}>
                        {counts[mode]}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-2">
            {filteredContributions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
                  {filter === "completed" ? (
                    <CheckCircle2 className="w-8 h-8 text-muted-foreground/50" />
                  ) : (
                    <ListTodo className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>
                <h3 className="text-base font-semibold mb-1">
                  {contributions.length === 0
                    ? "القائمة فارغة"
                    : filter === "completed"
                      ? "لا توجد عناصر مكتملة"
                      : "لا توجد عناصر قيد التنفيذ"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {contributions.length === 0
                    ? "أضف أول عنصر للبدء"
                    : "بدّل التصفية لعرض عناصر أخرى"}
                </p>
              </div>
            ) : (
              filteredContributions.map((contribution) => {
                const content = contribution.content as unknown as ListItem
                const member = getMember(contribution.user_id)
                const votes = content.votes || []
                const hasVoted = votes.includes(currentUserId)
                const displayName = member?.profile?.display_name || "مستخدم"

                return (
                  <div
                    key={contribution.id}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-xl bg-card border transition-all",
                      content.completed
                        ? "border-border/60 bg-muted/30"
                        : "border-border hover:border-primary/30 hover:shadow-sm",
                    )}
                  >
                    <Checkbox
                      checked={content.completed}
                      onCheckedChange={() => toggleComplete(contribution)}
                      disabled={page.is_locked}
                      className="shrink-0"
                      aria-label={content.completed ? "إلغاء الإنجاز" : "تحديد كمنجز"}
                    />

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm leading-snug transition-colors",
                          content.completed && "line-through text-muted-foreground",
                        )}
                      >
                        {content.text}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {displayName} · {format(new Date(contribution.created_at), "d MMM", { locale: ar })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">
                          {displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <Button
                        variant={hasVoted ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-7 gap-1 px-2",
                          !hasVoted && "bg-transparent",
                        )}
                        onClick={() => toggleVote(contribution)}
                        disabled={page.is_locked}
                        aria-label={hasVoted ? "إلغاء التصويت" : "تصويت"}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span className="text-xs tabular-nums">{votes.length}</span>
                      </Button>

                      {!page.is_locked && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteItem(contribution.id)}
                          aria-label="حذف العنصر"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </ScrollArea>

      {!page.is_locked && (
        <div className="border-t border-border bg-card/40 backdrop-blur-sm px-4 md:px-8 py-4 shrink-0">
          <div className="max-w-2xl mx-auto flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="أضف عنصراً جديداً..."
              className="bg-background"
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
            <Button onClick={addItem} disabled={!newItem.trim() || isAdding} className="shrink-0 gap-1.5">
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">إضافة</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
