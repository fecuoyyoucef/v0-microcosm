"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Layers, Map, BookOpen, Brain, Vote, ChevronDown, ChevronUp, Filter, GitBranch } from "lucide-react"
import type { MessageLayer, ConversationNode } from "@/lib/types"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useParams } from "next/navigation"
import { NodesPanel } from "./nodes-panel"
import { AIToolbar } from "./ai-toolbar"
import { useFeature } from "@/hooks/use-features"

interface LayerFilterProps {
  activeLayer: MessageLayer | "all"
  onLayerChange: (layer: MessageLayer | "all") => void
  nodes?: ConversationNode[]
  selectedNodeId?: string | null
  onNodeChange?: (nodeId: string | null) => void
  onNodesUpdate?: () => void
  currentUserId?: string
  isAdmin?: boolean
  groupId?: string
  messages?: Array<{ id: string; content: string; sender_id: string; created_at: string }>
}

export function LayerFilter({
  activeLayer,
  onLayerChange,
  nodes = [],
  selectedNodeId,
  onNodeChange,
  onNodesUpdate,
  currentUserId,
  isAdmin = false,
  groupId: propGroupId,
  messages = [],
}: LayerFilterProps) {
  const params = useParams()
  const groupId = propGroupId || (params.groupId as string)
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isNodesPanelOpen, setIsNodesPanelOpen] = useState(false)

  const mindMapEnabled = useFeature("mind_map")
  const notebookEnabled = useFeature("group_notebook")
  const memoryEnabled = useFeature("daily_memory")
  const decisionsEnabled = useFeature("decisions_system")
  const nodesEnabled = useFeature("conversation_nodes")

  const getFilterSummary = () => {
    const parts: string[] = []
    if (activeLayer !== "all") {
      parts.push(activeLayer === "upper" ? "مهم" : activeLayer === "standard" ? "عادي" : "ظل")
    }
    if (selectedNodeId && selectedNode) {
      parts.push(selectedNode.title)
    }
    return parts.length > 0 ? parts.join(" • ") : "بدون فلاتر"
  }

  return (
    <div className="shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-xl w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium shrink-0">الأدوات</span>
          {!isExpanded && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full truncate">
              {getFilterSummary()}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <div
        className={cn(
          "transition-all duration-300 overflow-hidden",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="px-4 pb-4 w-full space-y-3">
          {/* Layer Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">الطبقات:</span>
            <Button
              variant={activeLayer === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onLayerChange("all")}
              className={cn("h-8 text-xs gap-1 rounded-lg", activeLayer === "all" && "shadow-sm")}
            >
              <Layers className="w-3.5 h-3.5" />
              الكل
            </Button>

            <Button
              variant={activeLayer === "upper" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onLayerChange("upper")}
              className={cn(
                "h-8 text-xs gap-1 rounded-lg",
                activeLayer === "upper" && "bg-orange-100 dark:bg-orange-900/40 shadow-sm",
              )}
            >
              <span>🟠</span>
              مهم
            </Button>

            <Button
              variant={activeLayer === "standard" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onLayerChange("standard")}
              className={cn("h-8 text-xs gap-1 rounded-lg", activeLayer === "standard" && "shadow-sm")}
            >
              <span>⚪</span>
              عادي
            </Button>

            <Button
              variant={activeLayer === "shadow" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onLayerChange("shadow")}
              className={cn(
                "h-8 text-xs gap-1 rounded-lg",
                activeLayer === "shadow" && "bg-gray-200 dark:bg-gray-800 shadow-sm",
              )}
            >
              <span>🔘</span>
              ظل
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground w-full mb-1">الأدوات:</span>

            <AIToolbar groupId={groupId} messages={messages} />

            {nodesEnabled && (
              <Sheet open={isNodesPanelOpen} onOpenChange={setIsNodesPanelOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant={selectedNodeId ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 text-xs gap-1 rounded-lg hover:bg-violet-500/10"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-violet-600" />
                    العقد
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0">
                  {currentUserId && onNodeChange && onNodesUpdate && (
                    <NodesPanel
                      groupId={groupId}
                      nodes={nodes}
                      selectedNodeId={selectedNodeId}
                      onNodeSelect={(id) => {
                        onNodeChange(id)
                        setIsNodesPanelOpen(false)
                      }}
                      onNodesUpdate={onNodesUpdate}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                    />
                  )}
                </SheetContent>
              </Sheet>
            )}

            {mindMapEnabled && (
              <Link href={`/chat/${groupId}/map`}>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 rounded-lg hover:bg-primary/10">
                  <Map className="w-3.5 h-3.5 text-primary" />
                  الخريطة
                </Button>
              </Link>
            )}

            {notebookEnabled && (
              <Link href={`/chat/${groupId}/notebook`}>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 rounded-lg hover:bg-emerald-500/10">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  المفكرة
                </Button>
              </Link>
            )}

            {memoryEnabled && (
              <Link href={`/chat/${groupId}/memory`}>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 rounded-lg hover:bg-purple-500/10">
                  <Brain className="w-3.5 h-3.5 text-purple-600" />
                  الذاكرة
                </Button>
              </Link>
            )}

            {decisionsEnabled && (
              <Link href={`/chat/${groupId}/decisions`}>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 rounded-lg hover:bg-amber-500/10">
                  <Vote className="w-3.5 h-3.5 text-amber-600" />
                  القرارات
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
