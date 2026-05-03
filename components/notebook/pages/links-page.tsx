"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Trash2, Loader2, ExternalLink, Link2, Lock, Globe } from "lucide-react"
import type { NotebookPage, GroupMember, NotebookContribution } from "@/lib/types"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"

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
  const [addError, setAddError] = useState<string | null>(null)
  const [faviconErrors, setFaviconErrors] = useState<Record<string, boolean>>({})
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

  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim()
    if (!trimmed) return ""
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const addLink = async () => {
    if (!newUrl.trim() || page.is_locked) return

    setIsAdding(true)
    setAddError(null)

    try {
      const normalized = normalizeUrl(newUrl)
      try {
        new URL(normalized)
      } catch {
        setAddError("الرابط غير صالح. تأكد من صحته.")
        setIsAdding(false)
        return
      }

      const { error } = await supabase.from("notebook_contributions").insert({
        page_id: page.id,
        user_id: currentUserId,
        content: {
          url: normalized,
          title: newTitle.trim() || normalized,
        },
        position: contributions.length,
      })

      if (error) {
        setAddError(`خطأ في إضافة الرابط: ${error.message}`)
        return
      }

      setNewUrl("")
      setNewTitle("")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطأ غير معروف"
      setAddError(`خطأ غير متوقع: ${msg}`)
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
      return new URL(url).hostname.replace(/^www\./, "")
    } catch {
      return url
    }
  }

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    } catch {
      return null
    }
  }

  const uniqueDomains = useMemo(() => {
    const set = new Set<string>()
    contributions.forEach((c) => {
      const url = (c.content as LinkItem).url
      try {
        set.add(new URL(url).hostname)
      } catch {
        /* ignore */
      }
    })
    return set.size
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
          {/* Hero */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold leading-tight text-balance">{page.title}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground tabular-nums">{contributions.length}</span> رابط
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <span className="font-semibold text-foreground tabular-nums">{uniqueDomains}</span>{" "}
                    {uniqueDomains === 1 ? "نطاق" : "نطاقات"}
                  </span>
                  {page.is_locked && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-warning-foreground">
                        <Lock className="w-3 h-3" /> مقفلة
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Links list */}
          {contributions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
                <Link2 className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-base font-semibold mb-1">لا توجد روابط بعد</h3>
              <p className="text-sm text-muted-foreground">
                {page.is_locked ? "هذه الصفحة مقفلة" : "أضف أول رابط لمشاركته مع المجموعة"}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {contributions.map((contribution) => {
                const content = contribution.content as LinkItem
                const member = getMember(contribution.user_id)
                const domain = getDomain(content.url)
                const faviconUrl = getFaviconUrl(content.url)
                const hasFaviconError = faviconErrors[contribution.id]
                const displayName = member?.profile?.display_name || "مستخدم"

                return (
                  <a
                    key={contribution.id}
                    href={content.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "group flex items-center gap-3 p-3 md:p-4 rounded-xl bg-card border border-border",
                      "hover:border-primary/40 hover:shadow-sm transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <div className="w-11 h-11 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 overflow-hidden border border-border/40">
                      {faviconUrl && !hasFaviconError ? (
                        <Image
                          src={faviconUrl}
                          alt=""
                          width={28}
                          height={28}
                          className="w-7 h-7 object-contain"
                          unoptimized
                          onError={() =>
                            setFaviconErrors((prev) => ({ ...prev, [contribution.id]: true }))
                          }
                        />
                      ) : (
                        <Globe className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {content.title}
                        </p>
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5" dir="ltr">
                        {domain}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="bg-muted text-foreground text-[9px] font-semibold">
                            {displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] text-muted-foreground">
                          {displayName} ·{" "}
                          {format(new Date(contribution.created_at), "d MMM", { locale: ar })}
                        </span>
                      </div>
                    </div>

                    {!page.is_locked && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          deleteLink(contribution.id)
                        }}
                        aria-label="حذف الرابط"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {!page.is_locked && (
        <div className="border-t border-border bg-card/40 backdrop-blur-sm px-4 md:px-8 py-4 shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            {addError && (
              <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                {addError}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com"
                className="bg-background flex-1"
                dir="ltr"
                onKeyDown={(e) => e.key === "Enter" && addLink()}
              />
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="عنوان الرابط (اختياري)"
                className="bg-background flex-1"
                onKeyDown={(e) => e.key === "Enter" && addLink()}
              />
              <Button
                onClick={addLink}
                disabled={!newUrl.trim() || isAdding}
                className="shrink-0 gap-1.5"
              >
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
        </div>
      )}
    </div>
  )
}
