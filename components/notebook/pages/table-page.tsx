"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, Loader2, Table2, Check, Lock } from "lucide-react"
import type { NotebookPage, GroupMember } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TablePageProps {
  page: NotebookPage
  members: GroupMember[]
  currentUserId: string
}

interface TableContent {
  columns: string[]
  rows: Array<{ id: string; cells: string[] }>
}

export function TablePage({ page, members: _members, currentUserId: _currentUserId }: TablePageProps) {
  const [content, setContent] = useState<TableContent>({ columns: [], rows: [] })
  const [isSaving, setIsSaving] = useState(false)
  const [savedRecently, setSavedRecently] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const pageContent = page.content as TableContent
    setContent({
      columns: pageContent.columns || ["العمود 1", "العمود 2", "العمود 3"],
      rows: pageContent.rows || [],
    })
  }, [page.content])

  // In RTL, ensure the table starts scrolled to the right (showing the first column)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // For RTL, scrollLeft should be at max negative or max positive depending on browser
    // Setting it to scrollWidth aligns the start (right side in RTL) to be visible
    requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth
    })
  }, [content.columns.length])

  const saveContent = async (newContent: TableContent) => {
    setIsSaving(true)
    setSavedRecently(false)
    try {
      await supabase
        .from("notebook_pages")
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq("id", page.id)
      setSavedRecently(true)
      setTimeout(() => setSavedRecently(false), 1500)
    } finally {
      setIsSaving(false)
    }
  }

  const updateColumn = (index: number, value: string) => {
    if (page.is_locked) return
    const newColumns = [...content.columns]
    newColumns[index] = value
    const newContent = { ...content, columns: newColumns }
    setContent(newContent)
    saveContent(newContent)
  }

  const addColumn = () => {
    if (page.is_locked) return
    const newContent = {
      columns: [...content.columns, `العمود ${content.columns.length + 1}`],
      rows: content.rows.map((row) => ({
        ...row,
        cells: [...row.cells, ""],
      })),
    }
    setContent(newContent)
    saveContent(newContent)
  }

  const removeColumn = (index: number) => {
    if (page.is_locked || content.columns.length <= 1) return
    const newContent = {
      columns: content.columns.filter((_, i) => i !== index),
      rows: content.rows.map((row) => ({
        ...row,
        cells: row.cells.filter((_, i) => i !== index),
      })),
    }
    setContent(newContent)
    saveContent(newContent)
  }

  const addRow = () => {
    if (page.is_locked) return
    const newContent = {
      ...content,
      rows: [
        ...content.rows,
        {
          id: crypto.randomUUID(),
          cells: content.columns.map(() => ""),
        },
      ],
    }
    setContent(newContent)
    saveContent(newContent)
  }

  const updateCell = (rowIndex: number, cellIndex: number, value: string) => {
    if (page.is_locked) return
    const newRows = content.rows.map((row, i) =>
      i === rowIndex ? { ...row, cells: row.cells.map((c, j) => (j === cellIndex ? value : c)) } : row,
    )
    const newContent = { ...content, rows: newRows }
    setContent(newContent)
    saveContent(newContent)
  }

  const removeRow = (index: number) => {
    if (page.is_locked) return
    const newContent = {
      ...content,
      rows: content.rows.filter((_, i) => i !== index),
    }
    setContent(newContent)
    saveContent(newContent)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
          {/* Hero */}
          <div className="mb-6 pb-6 border-b border-border flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <Table2 className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight text-balance">{page.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {content.columns.length} {content.columns.length === 1 ? "عمود" : "أعمدة"} ·{" "}
                  {content.rows.length} {content.rows.length === 1 ? "صف" : "صفوف"}
                  {page.is_locked && (
                    <span className="inline-flex items-center gap-1 mr-2 text-warning-foreground">
                      <Lock className="w-3 h-3" /> مقفلة
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div
              className={cn(
                "hidden md:flex items-center gap-1.5 text-xs h-fit shrink-0 px-2.5 py-1 rounded-full transition-colors",
                isSaving
                  ? "bg-muted text-muted-foreground"
                  : savedRecently
                    ? "bg-success/10 text-success"
                    : "bg-transparent text-transparent",
              )}
              aria-live="polite"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : savedRecently ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>تم الحفظ</span>
                </>
              ) : (
                <span>·</span>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
            <div
              ref={scrollRef}
              dir="rtl"
              className="overflow-auto max-h-[60vh]"
              style={{
                touchAction: 'pan-x pan-y',
                overscrollBehaviorX: 'contain',
                WebkitOverflowScrolling: 'touch',
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <table className="border-collapse w-max">
                <thead>
                  <tr>
                    {content.columns.map((column, index) => (
                      <th
                        key={index}
                        className="p-0 border-b border-l border-border bg-secondary/60 first:border-l-0 min-w-[140px]"
                      >
                        <div className="flex items-center group/col">
                          <Input
                            value={column}
                            onChange={(e) => updateColumn(index, e.target.value)}
                            className="border-0 bg-transparent font-semibold text-foreground rounded-none h-11 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-background/40"
                            disabled={page.is_locked}
                            aria-label={`عنوان العمود ${index + 1}`}
                          />
                          {content.columns.length > 1 && !page.is_locked && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 opacity-0 group-hover/col:opacity-100 focus-visible:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 ml-1"
                              onClick={() => removeColumn(index)}
                              aria-label="حذف العمود"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </th>
                    ))}
                    {!page.is_locked && (
                      <th className="p-0 border-b border-l border-border bg-secondary/60 w-12">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-12 rounded-none hover:bg-primary/10 hover:text-primary"
                          onClick={addColumn}
                          aria-label="إضافة عمود"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {content.rows.map((row, rowIndex) => (
                    <tr key={row.id} className="group/row hover:bg-muted/30 transition-colors">
                      {row.cells.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="p-0 border-b border-l border-border first:border-l-0 last:border-b-0"
                        >
                          <Input
                            value={cell}
                            onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
                            className="border-0 bg-transparent rounded-none h-11 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-primary/5"
                            disabled={page.is_locked}
                            aria-label={`خلية صف ${rowIndex + 1} عمود ${cellIndex + 1}`}
                          />
                        </td>
                      ))}
                      {!page.is_locked && (
                        <td className="p-0 border-b border-l border-border last:border-b-0 w-12">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-12 rounded-none opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeRow(rowIndex)}
                            aria-label="حذف الصف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {content.rows.length === 0 && (
              <div className="text-center py-12 px-4 bg-muted/20">
                <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                  <Table2 className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium mb-1">لا توجد بيانات بعد</p>
                <p className="text-xs text-muted-foreground mb-3">أضف أول صف للجدول</p>
                {!page.is_locked && (
                  <Button size="sm" variant="outline" onClick={addRow} className="bg-transparent gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    إضافة صف
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {!page.is_locked && content.rows.length > 0 && (
        <div className="border-t border-border bg-card/40 backdrop-blur-sm px-4 md:px-8 py-4 shrink-0">
          <div className="max-w-6xl mx-auto flex justify-between items-center gap-3">
            <Button variant="outline" onClick={addRow} className="bg-transparent gap-1.5">
              <Plus className="w-4 h-4" />
              إضافة صف
            </Button>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : savedRecently ? (
                <>
                  <Check className="w-3 h-3 text-success" />
                  <span>تم الحفظ</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
