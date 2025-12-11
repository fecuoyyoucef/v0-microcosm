"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Trash2, Loader2, ExternalLink, Link2 } from "lucide-react"
import type { NotebookPage, GroupMember, NotebookContribution } from "@/lib/types"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface LinksPageProps {
  page: NotebookPage
  members: GroupMember[]
  currentUserId: string
}

interface LinkItem {
  url: string
  title: string
  description?: string
}

export function LinksPage({ page, members, currentUserId }: LinksPageProps) {
  const [contributions, setContributions] = useState<NotebookContribution[]>([])
  const [newUrl, setNewUrl] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchContributions = useCallback(async () => {
    const { data } = await supabase
      .from("notebook_contributions")
      .select("*, contributor:profiles(*)")
      .eq("page_id", page.id)
      .order("created_at", { ascending: false })

    if (data) {
      setContributions(data)
    }
    setIsLoading(false)
  }, [page.id, supabase])

  useEffect(() => {
    fetchContributions()

    const channel = supabase
      .channel(`links-page-${page.id}`)
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

  const addLink = async () => {
    if (!newUrl.trim() || page.is_locked) return

    setIsAdding(true)
    try {
      await supabase.from("notebook_contributions").insert({
        page_id: page.id,
        user_id: currentUserId,
        content: {
          url: newUrl.trim(),
          title: newTitle.trim() || newUrl.trim(),
        },
        position: contributions.length,
      })

      setNewUrl("")
      setNewTitle("")
    } finally {
      setIsAdding(false)
    }
  }

  const deleteLink = async (id: string) => {
    if (page.is_locked) return
    await supabase.from("notebook_contributions").delete().eq("id", id)
  }

  const getMember = (userId: string) => members.find((m) => m.user_id === userId)

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

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
        <div className="p-6 max-w-3xl mx-auto space-y-3">
          {contributions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد روابط بعد. أضف رابطاً جديداً!</p>
            </div>
          ) : (
            contributions.map((contribution) => {
              const content = contribution.content as LinkItem
              const member = getMember(contribution.user_id)

              return (
                <div
                  key={contribution.id}
                  className="group flex items-start gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Link2 className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <a
                      href={content.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-primary transition-colors flex items-center gap-2"
                    >
                      {content.title}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-sm text-muted-foreground truncate">{getDomain(content.url)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {member?.profile?.display_name?.charAt(0) || "؟"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {member?.profile?.display_name} -{" "}
                        {format(new Date(contribution.created_at), "d MMM", { locale: ar })}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                    onClick={() => deleteLink(contribution.id)}
                    disabled={page.is_locked}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {!page.is_locked && (
        <div className="p-4 border-t border-border bg-card/50">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex gap-3">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="الرابط (https://...)"
                className="bg-background flex-1"
                dir="ltr"
              />
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="العنوان (اختياري)"
                className="bg-background flex-1"
              />
              <Button onClick={addLink} disabled={!newUrl.trim() || isAdding}>
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
