"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { NotebookSidebar } from "./notebook-sidebar"
import { TextPage } from "./pages/text-page"
import { ListPage } from "./pages/list-page"
import { TablePage } from "./pages/table-page"
import { LinksPage } from "./pages/links-page"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Hash, FileText, Menu, Clock, Lock } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import type { Group, NotebookPage, GroupMember } from "@/lib/types"
import { PAGE_TYPE_META } from "./page-types"
import { cn } from "@/lib/utils"

interface NotebookContainerProps {
  groupId: string
  group: Group
  pages: NotebookPage[]
  members: GroupMember[]
  currentUserId: string
}

export function NotebookContainer({
  groupId,
  group,
  pages: initialPages,
  members,
  currentUserId,
}: NotebookContainerProps) {
  const [pages, setPages] = useState<NotebookPage[]>(initialPages)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(initialPages[0]?.id || null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const supabase = createClient()

  const selectedPage = pages.find((p) => p.id === selectedPageId)
  const pageTypeMeta = selectedPage
    ? PAGE_TYPE_META[selectedPage.page_type as keyof typeof PAGE_TYPE_META] ?? PAGE_TYPE_META.text
    : null

  useEffect(() => {
    const channel = supabase
      .channel(`notebook-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notebook_pages",
          filter: `group_id=eq.${groupId}`,
        },
        async () => {
          const { data } = await supabase
            .from("notebook_pages")
            .select("*")
            .eq("group_id", groupId)
            .order("created_at", { ascending: true })

          if (data) {
            setPages(data)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, supabase])

  const handlePageCreated = (pageId: string) => {
    setSelectedPageId(pageId)
    setIsMobileSidebarOpen(false)
  }

  const handlePageDeleted = (pageId: string) => {
    if (selectedPageId === pageId) {
      const remainingPages = pages.filter((p) => p.id !== pageId)
      setSelectedPageId(remainingPages[0]?.id || null)
    }
  }

  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId)
    setIsMobileSidebarOpen(false)
  }

  const renderPageContent = () => {
    if (!selectedPage) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold mb-2">لم يتم اختيار صفحة</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              اختر صفحة من القائمة على اليمين أو أنشئ صفحة جديدة لبدء العمل
            </p>
          </div>
        </div>
      )
    }

    switch (selectedPage.page_type) {
      case "text":
        return <TextPage page={selectedPage} members={members} currentUserId={currentUserId} />
      case "list":
        return <ListPage page={selectedPage} members={members} currentUserId={currentUserId} />
      case "table":
        return <TablePage page={selectedPage} members={members} currentUserId={currentUserId} />
      case "links":
        return <LinksPage page={selectedPage} members={members} currentUserId={currentUserId} />
      default:
        return <TextPage page={selectedPage} members={members} currentUserId={currentUserId} />
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Enhanced Header */}
      <div className="h-16 border-b border-border px-4 md:px-6 flex items-center justify-between bg-card/30 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
          <Link href={`/chat/${groupId}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="العودة للمجموعة">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-2.5 min-w-0">
            <Hash className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span className="font-semibold truncate">{group.name}</span>
            <span className="text-muted-foreground hidden sm:inline" aria-hidden="true">/</span>
            <span className="text-sm text-muted-foreground hidden sm:inline">المفكرة</span>
          </div>

          {selectedPage && pageTypeMeta && (
            <>
              <span className="text-muted-foreground hidden lg:inline" aria-hidden="true">/</span>
              <Badge
                variant="secondary"
                className={cn(
                  "hidden lg:inline-flex gap-1.5 px-2.5 py-1 font-medium",
                  pageTypeMeta.bgClass,
                  pageTypeMeta.fgClass,
                  "border-0",
                )}
              >
                {pageTypeMeta.label}
              </Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {selectedPage && (
            <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
              {selectedPage.is_locked && (
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  <span>مقفلة</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>
                  {format(new Date(selectedPage.updated_at), "d MMM yyyy - p", {
                    locale: ar,
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Mobile sidebar trigger */}
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 md:hidden" aria-label="القائمة">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <NotebookSidebar
                pages={pages}
                selectedPageId={selectedPageId}
                onSelectPage={handleSelectPage}
                groupId={groupId}
                currentUserId={currentUserId}
                onPageCreated={handlePageCreated}
                onPageDeleted={handlePageDeleted}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-72 border-l border-border shrink-0 overflow-hidden">
          <NotebookSidebar
            pages={pages}
            selectedPageId={selectedPageId}
            onSelectPage={handleSelectPage}
            groupId={groupId}
            currentUserId={currentUserId}
            onPageCreated={handlePageCreated}
            onPageDeleted={handlePageDeleted}
          />
        </div>

        {/* Page Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-background">{renderPageContent()}</div>
      </div>
    </div>
  )
}
