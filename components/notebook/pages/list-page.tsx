"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Trash2, Loader2, ThumbsUp } from "lucide-react"
import type { NotebookPage, GroupMember, NotebookContribution } from "@/lib/types"
import { cn } from "@/lib/utils"

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

export function ListPage({ page, members, currentUserId }: ListPageProps) {
  const [contributions, setContributions] = useState<NotebookContribution[]>([])
  const [newItem, setNewItem] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
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
      const nextPosition = contributions.length

      await supabase.from("notebook_contributions").insert({
        page_id: page.id,
        user_id: currentUserId,
        content: { text: newItem.trim(), completed: false, votes: [] },
        position: nextPosition,
      })

      setNewItem("")
    } finally {
      setIsAdding(false)
    }
  }

  const toggleComplete = async (contribution: NotebookContribution) => {
    if (page.is_locked) return

    const content = contribution.content as ListItem
    await supabase
      .from("notebook_contributions")
      .update({
        content: { ...content, completed: !content.completed },
      })
      .eq("id", contribution.id)
  }

  const toggleVote = async (contribution: NotebookContribution) => {
    if (page.is_locked) return

    const content = contribution.content as ListItem
    const votes = content.votes || []
    const hasVoted = votes.includes(currentUserId)

    await supabase
      .from("notebook_contributions")
      .update({
        content: {
          ...content,
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
        <div className="p-6 max-w-2xl mx-auto space-y-2">
          {contributions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>القائمة فارغة. أضف عنصراً جديداً!</p>
            </div>
          ) : (
            contributions.map((contribution) => {
              const content = contribution.content as ListItem
              const member = getMember(contribution.user_id)
              const votes = content.votes || []
              const hasVoted = votes.includes(currentUserId)

              return (
                <div
                  key={contribution.id}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-lg bg-card border border-border transition-colors",
                    content.completed && "opacity-60",
                  )}
                >
                  <Checkbox
                    checked={content.completed}
                    onCheckedChange={() => toggleComplete(contribution)}
                    disabled={page.is_locked}
                  />

                  <span className={cn("flex-1", content.completed && "line-through text-muted-foreground")}>
                    {content.text}
                  </span>

                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {member?.profile?.display_name?.charAt(0) || "؟"}
                      </AvatarFallback>
                    </Avatar>

                    <Button
                      variant={hasVoted ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 gap-1"
                      onClick={() => toggleVote(contribution)}
                      disabled={page.is_locked}
                    >
                      <ThumbsUp className={cn("w-3 h-3", hasVoted && "text-primary")} />
                      <span className="text-xs">{votes.length}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => deleteItem(contribution.id)}
                      disabled={page.is_locked}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {!page.is_locked && (
        <div className="p-4 border-t border-border bg-card/50">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="أضف عنصراً جديداً..."
              className="bg-background"
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
            <Button onClick={addItem} disabled={!newItem.trim() || isAdding}>
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
