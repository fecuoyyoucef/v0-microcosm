"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Send, Loader2, FileText, Users, MessageSquare, Lock } from "lucide-react"
import type { NotebookPage, GroupMember, NotebookContribution } from "@/lib/types"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface TextPageProps {
  page: NotebookPage
  members: GroupMember[]
  currentUserId: string
}

export function TextPage({ page, members, currentUserId }: TextPageProps) {
  const [contributions, setContributions] = useState<NotebookContribution[]>([])
  const [newText, setNewText] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [addError, setAddError] = useState<string | null>(null)
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
      .channel(`text-page-${page.id}`)
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

  const addContribution = async () => {
    if (!newText.trim() || page.is_locked) return

    setIsAdding(true)
    setAddError(null)

    try {
      const { error } = await supabase
        .from("notebook_contributions")
        .insert({
          page_id: page.id,
          user_id: currentUserId,
          content: { text: newText.trim() },
          // position متروك للقيمة الافتراضية على الخادم؛ نعتمد على created_at للترتيب
        })
        .select()
        .single()

      if (error) {
        setAddError(`خطأ في إضافة المساهمة: ${error.message}`)
        return
      }

      setNewText("")
      // الـ realtime subscription سيُحدّث القائمة تلقائياً
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطأ غير معروف"
      setAddError(`خطأ غير متوقع: ${msg}`)
    } finally {
      setIsAdding(false)
    }
  }

  const getMember = (userId: string) => members.find((m) => m.user_id === userId)

  const uniqueContributors = useMemo(() => {
    const ids = new Set(contributions.map((c) => c.user_id))
    return ids.size
  }, [contributions])

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
        <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">
          {/* Page Hero */}
          <div className="mb-8 pb-6 border-b border-border">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold leading-tight text-balance">{page.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  أُنشئت {format(new Date(page.created_at), "d MMMM yyyy", { locale: ar })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>
                  <span className="font-semibold text-foreground">{contributions.length}</span> مساهمة
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>
                  <span className="font-semibold text-foreground">{uniqueContributors}</span> مشارك
                </span>
              </div>
              {page.is_locked && (
                <div className="flex items-center gap-1.5 text-warning-foreground">
                  <Lock className="w-3.5 h-3.5" />
                  <span>الصفحة مقفلة</span>
                </div>
              )}
            </div>
          </div>

          {/* Contributions Timeline */}
          {contributions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-base font-semibold mb-1">لا توجد مساهمات بعد</h3>
              <p className="text-sm text-muted-foreground">
                {page.is_locked ? "هذه الصفحة مقفلة" : "كن أول من يضيف فكرة لهذه الصفحة"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {contributions.map((contribution, index) => {
                const member = getMember(contribution.user_id)
                const text = (contribution.content as { text?: string })?.text || ""
                const isOwn = contribution.user_id === currentUserId
                const displayName = member?.profile?.display_name || "مستخدم"
                const initial = displayName.charAt(0)

                return (
                  <article
                    key={contribution.id}
                    className={cn(
                      "group relative rounded-xl border bg-card transition-all hover:shadow-sm",
                      isOwn ? "border-primary/20 bg-primary/[0.02]" : "border-border",
                    )}
                  >
                    <div className="p-4 md:p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-9 w-9 shrink-0 ring-2 ring-background">
                          <AvatarFallback
                            className={cn(
                              "text-sm font-semibold",
                              isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                            )}
                          >
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <p className="text-sm font-semibold leading-tight">{displayName}</p>
                            {isOwn && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                أنت
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(contribution.created_at), "d MMM yyyy، p", { locale: ar })}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground/60 tabular-nums" aria-hidden="true">
                          #{index + 1}
                        </span>
                      </div>

                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90 pr-1">
                        {text}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      {!page.is_locked && (
        <div className="border-t border-border bg-card/40 backdrop-blur-sm px-4 md:px-8 py-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            {addError && (
              <div className="mb-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                {addError}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    addContribution()
                  }
                }}
                placeholder="اكتب مساهمتك... (Ctrl + Enter للإرسال)"
                className="min-h-[60px] md:min-h-[72px] resize-none bg-background"
              />
              <Button
                onClick={addContribution}
                disabled={!newText.trim() || isAdding}
                size="icon"
                className="h-11 w-11 shrink-0 shadow-sm"
                aria-label="إرسال المساهمة"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
