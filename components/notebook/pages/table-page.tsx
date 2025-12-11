"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, Loader2 } from "lucide-react"
import type { NotebookPage, GroupMember } from "@/lib/types"

interface TablePageProps {
  page: NotebookPage
  members: GroupMember[]
  currentUserId: string
}

interface TableContent {
  columns: string[]
  rows: Array<{ id: string; cells: string[] }>
}

export function TablePage({ page, members, currentUserId }: TablePageProps) {
  const [content, setContent] = useState<TableContent>({ columns: [], rows: [] })
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const pageContent = page.content as TableContent
    setContent({
      columns: pageContent.columns || ["العمود 1", "العمود 2", "العمود 3"],
      rows: pageContent.rows || [],
    })
  }, [page.content])

  const saveContent = async (newContent: TableContent) => {
    setIsSaving(true)
    try {
      await supabase
        .from("notebook_pages")
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq("id", page.id)
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
    const newRows = [...content.rows]
    newRows[rowIndex].cells[cellIndex] = value
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
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {content.columns.map((column, index) => (
                    <th key={index} className="p-0 border border-border bg-secondary">
                      <div className="flex items-center">
                        <Input
                          value={column}
                          onChange={(e) => updateColumn(index, e.target.value)}
                          className="border-0 bg-transparent font-medium text-center rounded-none"
                          disabled={page.is_locked}
                        />
                        {content.columns.length > 1 && !page.is_locked && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive"
                            onClick={() => removeColumn(index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </th>
                  ))}
                  {!page.is_locked && (
                    <th className="p-2 border border-border bg-secondary w-12">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={addColumn}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {content.rows.map((row, rowIndex) => (
                  <tr key={row.id} className="group">
                    {row.cells.map((cell, cellIndex) => (
                      <td key={cellIndex} className="p-0 border border-border">
                        <Input
                          value={cell}
                          onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
                          className="border-0 bg-transparent rounded-none"
                          disabled={page.is_locked}
                        />
                      </td>
                    ))}
                    {!page.is_locked && (
                      <td className="p-2 border border-border w-12">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => removeRow(rowIndex)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {content.rows.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>الجدول فارغ. أضف صفاً جديداً!</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {!page.is_locked && (
        <div className="p-4 border-t border-border bg-card/50 flex justify-center">
          <Button variant="outline" onClick={addRow} className="bg-transparent">
            <Plus className="w-4 h-4 ml-2" />
            إضافة صف
          </Button>
          {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2 text-muted-foreground" />}
        </div>
      )}
    </div>
  )
}
