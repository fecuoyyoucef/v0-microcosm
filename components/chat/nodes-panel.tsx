"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Vote,
  MessageCircle,
  Briefcase,
  HelpCircle,
  CheckCircle,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Trash2,
  Sparkles,
  Folder,
  FolderOpen,
  Loader2,
} from "lucide-react"
import type { ConversationNode, NodeSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

interface NodesPanelProps {
  groupId: string
  nodes: ConversationNode[]
  selectedNodeId: string | null
  onNodeSelect: (nodeId: string | null) => void
  onNodesUpdate: () => void
  currentUserId: string
  isAdmin: boolean
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  vote: Vote,
  "message-circle": MessageCircle,
  briefcase: Briefcase,
  "help-circle": HelpCircle,
  "check-circle": CheckCircle,
  folder: Folder,
}

const DEFAULT_COLORS = [
  "#F59E0B",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
]

export function NodesPanel({
  groupId,
  nodes,
  selectedNodeId,
  onNodeSelect,
  onNodesUpdate,
  currentUserId,
  isAdmin,
}: NodesPanelProps) {
  const supabase = createClient()
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [newNodeTitle, setNewNodeTitle] = useState("")
  const [newNodeColor, setNewNodeColor] = useState(DEFAULT_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)
  const [summaries, setSummaries] = useState<Record<string, NodeSummary>>({})
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null)

  // Organize nodes into hierarchy
  const { primaryNodes, childrenMap } = useMemo(() => {
    const primary = nodes.filter((n) => !n.parent_id).sort((a, b) => a.sort_order - b.sort_order)
    const children: Record<string, ConversationNode[]> = {}

    nodes
      .filter((n) => n.parent_id)
      .forEach((node) => {
        if (!children[node.parent_id!]) {
          children[node.parent_id!] = []
        }
        children[node.parent_id!].push(node)
      })

    // Sort children
    Object.keys(children).forEach((key) => {
      children[key].sort((a, b) => a.sort_order - b.sort_order)
    })

    return { primaryNodes: primary, childrenMap: children }
  }, [nodes])

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const createNode = async () => {
    if (!newNodeTitle.trim()) return
    setIsCreating(true)

    const { error } = await supabase.from("conversation_nodes").insert({
      group_id: groupId,
      parent_id: createParentId,
      title: newNodeTitle.trim(),
      color: newNodeColor,
      icon: createParentId ? "folder" : "folder",
      created_by: currentUserId,
      sort_order: createParentId ? (childrenMap[createParentId]?.length || 0) + 1 : primaryNodes.length + 1,
    })

    if (!error) {
      setNewNodeTitle("")
      setNewNodeColor(DEFAULT_COLORS[0])
      setIsCreateOpen(false)
      setCreateParentId(null)
      onNodesUpdate()
    }
    setIsCreating(false)
  }

  const deleteNode = async (nodeId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه العقدة؟")) return

    const { error } = await supabase.from("conversation_nodes").delete().eq("id", nodeId)
    if (!error) {
      onNodesUpdate()
      if (selectedNodeId === nodeId) {
        onNodeSelect(null)
      }
    }
  }

  const generateSummary = async (node: ConversationNode) => {
    setLoadingSummary(node.id)

    try {
      const response = await fetch("/api/ai/summarize-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: node.id, groupId }),
      })

      if (response.ok) {
        const data = await response.json()
        setSummaries((prev) => ({ ...prev, [node.id]: data.summary }))
      }
    } catch (error) {
      console.error("Error generating summary:", error)
    }

    setLoadingSummary(null)
  }

  const getNodeIcon = (node: ConversationNode) => {
    const IconComponent = ICON_MAP[node.icon] || Folder
    return <IconComponent className="w-4 h-4" />
  }

  const renderNode = (node: ConversationNode, isChild = false) => {
    const children = childrenMap[node.id] || []
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNodeId === node.id
    const isPrimary = !node.parent_id

    return (
      <div key={node.id} className={cn(isChild && "mr-4")}>
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group",
            isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted",
          )}
          onClick={() => onNodeSelect(node.id)}
        >
          {/* Expand/Collapse for primary nodes */}
          {isPrimary && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.id)
              }}
              className="w-5 h-5 flex items-center justify-center hover:bg-muted rounded"
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )
              ) : (
                <div className="w-3.5" />
              )}
            </button>
          )}

          {/* Icon */}
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: node.color + "20", color: node.color }}
          >
            {isPrimary ? (
              getNodeIcon(node)
            ) : isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5" />
            ) : (
              <Folder className="w-3.5 h-3.5" />
            )}
          </div>

          {/* Title */}
          <span className={cn("flex-1 text-sm truncate", isPrimary && "font-medium")}>{node.title}</span>

          {/* Message count */}
          {node.messages_count !== undefined && node.messages_count > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{node.messages_count}</span>
          )}

          {/* Actions */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            {/* AI Summary for primary nodes only */}
            {isPrimary && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  generateSummary(node)
                }}
                disabled={loadingSummary === node.id}
              >
                {loadingSummary === node.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                )}
              </Button>
            )}

            {/* Add sub-node for primary nodes */}
            {isPrimary && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  setCreateParentId(node.id)
                  setIsCreateOpen(true)
                }}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* More options */}
            {(isAdmin || node.created_by === currentUserId) && !node.is_default && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteNode(node.id)}>
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Children */}
        {isPrimary && isExpanded && hasChildren && (
          <div className="mt-1 mr-2 border-r border-border pr-2">
            {children.map((child) => renderNode(child, true))}
          </div>
        )}

        {/* Summary */}
        {summaries[node.id] && isPrimary && (
          <div className="mr-7 mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">ملخص AI</span>
            </div>
            <p className="text-muted-foreground">{summaries[node.id].summary}</p>
            {summaries[node.id].key_points?.length > 0 && (
              <div className="mt-2">
                <span className="text-xs font-medium">النقاط الرئيسية:</span>
                <ul className="mt-1 space-y-1">
                  {summaries[node.id].key_points.map((point, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      • {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-medium">العقد</span>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCreateParentId(null)}>
              <Plus className="w-3.5 h-3.5 ml-1" />
              عقدة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{createParentId ? "إنشاء عقدة فرعية" : "إنشاء عقدة أساسية"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">اسم العقدة</label>
                <Input
                  value={newNodeTitle}
                  onChange={(e) => setNewNodeTitle(e.target.value)}
                  placeholder="مثال: أفكار المشروع"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">اللون</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        "w-8 h-8 rounded-full transition-transform",
                        newNodeColor === color && "ring-2 ring-offset-2 ring-primary scale-110",
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewNodeColor(color)}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={createNode} disabled={!newNodeTitle.trim() || isCreating} className="w-full">
                {isCreating ? "جاري الإنشاء..." : "إنشاء"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* All messages option */}
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
              selectedNodeId === null ? "bg-primary/10 text-primary" : "hover:bg-muted",
            )}
            onClick={() => onNodeSelect(null)}
          >
            <div className="w-5 h-5" />
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">كل الرسائل</span>
          </div>

          {/* Primary nodes */}
          {primaryNodes.map((node) => renderNode(node))}
        </div>
      </ScrollArea>
    </div>
  )
}
