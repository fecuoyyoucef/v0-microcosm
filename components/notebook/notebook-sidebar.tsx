"use client"

import type React from "react"

import { useMemo, useState } from "react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Plus,
  FileText,
  ListTodo,
  Table2,
  Link2,
  MoreVertical,
  Trash2,
  Lock,
  Unlock,
  Loader2,
  Search,
  BookOpen,
  Sparkles,
} from "lucide-react"
import type { NotebookPage, NotebookPageType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { PAGE_TYPE_META } from "./page-types"

interface NotebookSidebarProps {
  pages: NotebookPage[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
  groupId: string
  currentUserId: string
  onPageCreated: (pageId: string) => void
  onPageDeleted: (pageId: string) => void
}

const PAGE_TYPE_ICONS: Record<Exclude<NotebookPageType, "canvas">, React.ReactNode> = {
  text: <FileText className="w-4 h-4" />,
  list: <ListTodo className="w-4 h-4" />,
  table: <Table2 className="w-4 h-4" />,
  links: <Link2 className="w-4 h-4" />,
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
  const [newPageType, setNewPageType] = useState<Exclude<NotebookPageType, "canvas">>("text")
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [pageToDelete, setPageToDelete] = useState<NotebookPage | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClient()

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages
    const q = searchQuery.trim().toLowerCase()
    return pages.filter((p) => p.title.toLowerCase().includes(q))
  }, [pages, searchQuery])

  const createPage = async () => {
    if (!newPageTitle.trim()) return

    setIsCreating(true)
    setCreateError(null)

    try {
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
        setCreateError(`خطأ في إنشاء الصفحة: ${error.message}`)
        return
      }

      if (data) {
        setNewPageTitle("")
        setNewPageType("text")
        setIsCreateOpen(false)
        onPageCreated(data.id)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطأ غير معروف"
      setCreateError(`خطأ غير متوقع: ${msg}`)
    } finally {
      setIsCreating(false)
    }
  }

  const confirmDeletePage = async () => {
    if (!pageToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from("notebook_pages").delete().eq("id", pageToDelete.id)
      if (error) {
        toast.error("تعذّر حذف الصفحة", {
          description: error.message || "قد لا تملك الصلاحية الكافية.",
        })
        return
      }
      toast.success("تم حذف الصفحة")
      onPageDeleted(pageToDelete.id)
      setPageToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleLock = async (page: NotebookPage) => {
    const willLock = !page.is_locked
    const { error } = await supabase
      .from("notebook_pages")
      .update({
        is_locked: willLock,
        locked_by: willLock ? currentUserId : null,
      })
      .eq("id", page.id)

    if (error) {
      toast.error(willLock ? "تعذّر قفل الصفحة" : "تعذّر فتح القفل", {
        description: "قد لا تملك الصلاحية لتعديل هذه الصفحة.",
      })
      return
    }
    toast.success(willLock ? "تم قفل الصفحة" : "تم فتح القفل")
  }

  const getInitialContent = (type: Exclude<NotebookPageType, "canvas">) => {
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
    <div className="h-full bg-sidebar/60 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold leading-tight">المفكرة</h2>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {pages.length} {pages.length === 1 ? "صفحة" : "صفحات"}
              </p>
            </div>
          </div>

          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open)
              if (!open) setCreateError(null)
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-8 gap-1.5 shadow-sm"
                aria-label="إنشاء صفحة جديدة"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="text-xs">جديدة</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  إنشاء صفحة جديدة
                </DialogTitle>
                <DialogDescription>اختر نوع الصفحة المناسب لمحتواك</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 mt-2">
                {createError && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                    {createError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="page-title">عنوان الصفحة</Label>
                  <Input
                    id="page-title"
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                    placeholder="مثال: أفكار المشروع"
                    className="bg-background"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label>نوع الصفحة</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(PAGE_TYPE_META) as Array<keyof typeof PAGE_TYPE_META>).map((type) => {
                      const meta = PAGE_TYPE_META[type]
                      const isSelected = newPageType === type
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewPageType(type)}
                          className={cn(
                            "flex flex-col items-start gap-2 p-3 rounded-lg border text-right transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40",
                          )}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-md flex items-center justify-center",
                              meta.bgClass,
                              meta.fgClass,
                            )}
                          >
                            {PAGE_TYPE_ICONS[type]}
                          </div>
                          <div className="min-w-0 w-full">
                            <p className="text-sm font-medium leading-tight">{meta.label}</p>
                            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                              {meta.description}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Button
                  onClick={createPage}
                  disabled={!newPageTitle.trim() || isCreating}
                  className="w-full"
                  size="lg"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 ml-2" />
                      إنشاء الصفحة
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        {pages.length > 0 && (
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الصفحات..."
              className="h-8 pr-8 text-xs bg-background/60"
            />
          </div>
        )}
      </div>

      {/* Page list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {pages.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">لا توجد صفحات بعد</p>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                ابدأ بإنشاء صفحة لتنظيم أفكار مجموعتك
              </p>
              <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                إنشاء أول صفحة
              </Button>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Search className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">لا توجد نتائج لـ &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            filteredPages.map((page) => {
              const meta = PAGE_TYPE_META[page.page_type as keyof typeof PAGE_TYPE_META] ?? PAGE_TYPE_META.text
              const isSelected = selectedPageId === page.id
              return (
                <div
                  key={page.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectPage(page.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onSelectPage(page.id)
                    }
                  }}
                  className={cn(
                    "group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "bg-primary/10 shadow-sm"
                      : "hover:bg-secondary/60",
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? cn(meta.bgClass, meta.fgClass) : "bg-muted text-muted-foreground",
                    )}
                  >
                    {PAGE_TYPE_ICONS[page.page_type as keyof typeof PAGE_TYPE_ICONS] ?? PAGE_TYPE_ICONS.text}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm truncate leading-tight",
                        isSelected ? "font-semibold text-foreground" : "font-medium text-foreground/90",
                      )}
                    >
                      {page.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{meta.label}</p>
                  </div>

                  {page.is_locked && (
                    <Lock className="w-3 h-3 text-muted-foreground shrink-0" aria-label="مقفلة" />
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-6 w-6 shrink-0 transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                        )}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="خيارات الصفحة"
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
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setPageToDelete(page)}
                      >
                        <Trash2 className="h-4 w-4 ml-2" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* حوار تأكيد الحذف */}
      <AlertDialog
        open={pageToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPageToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الصفحة؟</AlertDialogTitle>
            <AlertDialogDescription>
              {pageToDelete
                ? `سيتم حذف صفحة "${pageToDelete.title}" وجميع مساهماتها نهائياً. لا يمكن التراجع عن هذا الإجراء.`
                : "هل أنت متأكد من حذف هذه الصفحة؟"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmDeletePage()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                "حذف نهائياً"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
