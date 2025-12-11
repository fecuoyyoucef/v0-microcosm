"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, FileText, List, Table, Link2, MoreVertical, Trash2, Lock, Unlock, Loader2 } from "lucide-react"
import type { NotebookPage, NotebookPageType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface NotebookSidebarProps {
  pages: NotebookPage[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
  groupId: string
  currentUserId: string
  onPageCreated: (pageId: string) => void
  onPageDeleted: (pageId: string) => void
}

const PAGE_TYPE_ICONS: Record<NotebookPageType, React.ReactNode> = {
  text: <FileText className="w-4 h-4" />,
  list: <List className="w-4 h-4" />,
  table: <Table className="w-4 h-4" />,
  canvas: <FileText className="w-4 h-4" />,
  links: <Link2 className="w-4 h-4" />,
}

const PAGE_TYPE_LABELS: Record<NotebookPageType, string> = {
  text: "صفحة نصية",
  list: "قائمة",
  table: "جدول",
  canvas: "لوحة رسم",
  links: "مجمّع روابط",
}

export function NotebookSidebar({
  pages,
  selectedPageId,
  onSelectPage,
  groupId,
  currentUserId,
  onPageCreated,
  onPageDeleted,
}: NotebookSidebarProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newPageTitle, setNewPageTitle] = useState("")
  const [newPageType, setNewPageType] = useState<NotebookPageType>("text")
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const supabase = createClient()

  const createPage = async () => {
    if (!newPageTitle.trim()) return

    setIsCreating(true)
    setCreateError(null)

    try {
      console.log("[v0] Creating notebook page:", { groupId, title: newPageTitle, type: newPageType })

      const { data, error } = await supabase
        .from("notebook_pages")
        .insert({
          group_id: groupId,
          title: newPageTitle.trim(),
          page_type: newPageType,
          content: getInitialContent(newPageType),
          created_by: currentUserId,
        })
        .select()
        .single()

      if (error) {
        console.error("[v0] Error creating page:", error)
        setCreateError(`خطأ في إنشاء الصفحة: ${error.message}`)
        return
      }

      if (data) {
        console.log("[v0] Page created successfully:", data.id)
        setNewPageTitle("")
        setNewPageType("text")
        setIsCreateOpen(false)
        onPageCreated(data.id)
      }
    } catch (err: any) {
      console.error("[v0] Unexpected error:", err)
      setCreateError(`خطأ غير متوقع: ${err.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  const deletePage = async (pageId: string) => {
    const { error } = await supabase.from("notebook_pages").delete().eq("id", pageId)

    if (!error) {
      onPageDeleted(pageId)
    }
  }

  const toggleLock = async (page: NotebookPage) => {
    await supabase
      .from("notebook_pages")
      .update({
        is_locked: !page.is_locked,
        locked_by: !page.is_locked ? currentUserId : null,
      })
      .eq("id", page.id)
  }

  const getInitialContent = (type: NotebookPageType) => {
    switch (type) {
      case "text":
        return { blocks: [] }
      case "list":
        return { items: [] }
      case "table":
        return { columns: ["العمود 1", "العمود 2", "العمود 3"], rows: [] }
      case "links":
        return { links: [] }
      default:
        return {}
    }
  }

  return (
    <div className="h-full border-l border-border bg-card/50 flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium">الصفحات</span>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (!open) setCreateError(null)
          }}
        >
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء صفحة جديدة</DialogTitle>
              <DialogDescription>اختر نوع الصفحة وأدخل عنوانها</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {createError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{createError}</div>
              )}
              <div className="space-y-2">
                <Label>عنوان الصفحة</Label>
                <Input
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  placeholder="مثال: أفكار المشروع"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>نوع الصفحة</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PAGE_TYPE_LABELS) as NotebookPageType[])
                    .filter((t) => t !== "canvas")
                    .map((type) => (
                      <Button
                        key={type}
                        variant={newPageType === type ? "secondary" : "outline"}
                        className={cn("justify-start gap-2", newPageType !== type && "bg-transparent")}
                        onClick={() => setNewPageType(type)}
                      >
                        {PAGE_TYPE_ICONS[type]}
                        {PAGE_TYPE_LABELS[type]}
                      </Button>
                    ))}
                </div>
              </div>
              <Button onClick={createPage} disabled={!newPageTitle.trim() || isCreating} className="w-full">
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    جاري الإنشاء...
                  </>
                ) : (
                  "إنشاء الصفحة"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {pages.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">لا توجد صفحات بعد</p>
              <Button variant="outline" size="sm" className="mt-3 bg-transparent" onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 ml-2" />
                إنشاء صفحة
              </Button>
            </div>
          ) : (
            pages.map((page) => (
              <div
                key={page.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                  selectedPageId === page.id ? "bg-primary/10 text-primary" : "hover:bg-secondary",
                )}
                onClick={() => onSelectPage(page.id)}
              >
                <span className={selectedPageId === page.id ? "text-primary" : "text-muted-foreground"}>
                  {PAGE_TYPE_ICONS[page.page_type]}
                </span>
                <span className="flex-1 truncate text-sm">{page.title}</span>
                {page.is_locked && <Lock className="w-3 h-3 text-muted-foreground" />}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => toggleLock(page)}>
                      {page.is_locked ? (
                        <>
                          <Unlock className="h-4 w-4 ml-2" />
                          فتح القفل
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 ml-2" />
                          قفل الصفحة
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => deletePage(page.id)}>
                      <Trash2 className="h-4 w-4 ml-2" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
