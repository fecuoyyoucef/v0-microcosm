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
import { ChevronLeft, Hash, FileText, Menu } from "lucide-react"
import Link from "next/link"
import type { Group, NotebookPage, GroupMember } from "@/lib/types"

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
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>اختر صفحة من القائمة أو أنشئ صفحة جديدة</p>
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
      {/* Header */}
      <div className="h-14 border-b border-border px-3 md:px-4 flex items-center justify-between bg-card/50 shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Link href={`/chat/${groupId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <Hash className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium truncate">{group.name}</span>
            <span className="text-muted-foreground hidden sm:inline">/</span>
            <span className="text-muted-foreground hidden sm:inline">المفكرة الجماعية</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedPage && (
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span>آخر تحديث:</span>
              <span>
                {new Date(selectedPage.updated_at).toLocaleDateString("ar", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}

          {/* Mobile sidebar trigger */}
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 border-l border-border shrink-0">
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

        {/* Page Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">{renderPageContent()}</div>
      </div>
    </div>
  )
}
