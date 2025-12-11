"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import type { NotebookPage, GroupMember, NotebookContribution } from "@/lib/types"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

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
    console.log("[v0] Fetching contributions for page:", page.id)
    const { data, error } = await supabase
      .from("notebook_contributions")
      .select("*, contributor:profiles(*)")
      .eq("page_id", page.id)
      .order("position", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching contributions:", error)
    }

    if (data) {
      console.log("[v0] Contributions fetched:", data.length)
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
      const nextPosition = contributions.length
      console.log("[v0] Adding contribution to page:", page.id)

      const { data, error } = await supabase
        .from("notebook_contributions")
        .insert({
          page_id: page.id,
          user_id: currentUserId,
          content: { text: newText.trim() },
          position: nextPosition,
        })
        .select()
        .single()

      if (error) {
        console.error("[v0] Error adding contribution:", error)
        setAddError(`خطأ في إضافة المساهمة: ${error.message}`)
        return
      }

      console.log("[v0] Contribution added:", data?.id)
      setNewText("")
      // Refresh contributions
      fetchContributions()
    } catch (err: any) {
      console.error("[v0] Unexpected error:", err)
      setAddError(`خطأ غير متوقع: ${err.message}`)
    } finally {
      setIsAdding(false)
    }
  }

  const getMember = (userId: string) => members.find((m) => m.user_id === userId)

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
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
          {contributions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>لا توجد مساهمات بعد. كن أول من يكتب!</p>
            </div>
          ) : (
            contributions.map((contribution) => {
              const member = getMember(contribution.user_id)
              const text = (contribution.content as { text?: string })?.text || ""

              return (
                <div key={contribution.id} className="p-4 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {member?.profile?.display_name?.charAt(0) || "؟"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{member?.profile?.display_name || "مستخدم"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(contribution.created_at), "d MMMM yyyy - p", { locale: ar })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {!page.is_locked && (
        <div className="p-3 md:p-4 border-t border-border bg-card/50">
          <div className="max-w-3xl mx-auto">
            {addError && (
              <div className="mb-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">{addError}</div>
            )}
            <div className="flex gap-3">
              <Textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="أضف مساهمتك..."
                className="min-h-[60px] md:min-h-[80px] resize-none bg-background"
              />
              <Button onClick={addContribution} disabled={!newText.trim() || isAdding} className="shrink-0 self-end">
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
