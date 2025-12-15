"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Layers, Map, BookOpen, Brain, Vote, GitBranch } from "lucide-react"
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
    <div className="shrink-0 border-b border-border/30 bg-black/30 backdrop-blur-xl w-full">
      <div className="px-3 py-2 w-full">
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3">
          <div className="flex items-center gap-2 w-max">
            {/* Layer Filters */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 shrink-0">
              <Button
                variant={activeLayer === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onLayerChange("all")}
                className={cn(
                  "h-8 text-xs gap-1 rounded-lg px-2 whitespace-nowrap",
                  activeLayer === "all" && "shadow-sm",
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                الكل
              </Button>

              <Button
                variant={activeLayer === "upper" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onLayerChange("upper")}
                className={cn(
                  "h-8 text-xs gap-1 rounded-lg px-2 whitespace-nowrap",
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
                className={cn(
                  "h-8 text-xs gap-1 rounded-lg px-2 whitespace-nowrap",
                  activeLayer === "standard" && "shadow-sm",
                )}
              >
                <span>⚪</span>
                عادي
              </Button>

              <Button
                variant={activeLayer === "shadow" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onLayerChange("shadow")}
                className={cn(
                  "h-8 text-xs gap-1 rounded-lg px-2 whitespace-nowrap",
                  activeLayer === "shadow" && "bg-gray-200 dark:bg-gray-800 shadow-sm",
                )}
              >
                <span>🔘</span>
                ظل
              </Button>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <AIToolbar groupId={groupId} messages={messages} />

              {/* Nodes Panel */}
              {nodesEnabled && (
                <Sheet open={isNodesPanelOpen} onOpenChange={setIsNodesPanelOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant={selectedNodeId ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-8 text-xs gap-1 rounded-lg px-2 hover:bg-violet-500/10 whitespace-nowrap",
                        selectedNodeId && "shadow-sm",
                      )}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1 rounded-lg px-2 hover:bg-primary/10 whitespace-nowrap"
                  >
                    <Map className="w-3.5 h-3.5 text-primary" />
                    الخريطة
                  </Button>
                </Link>
              )}

              {notebookEnabled && (
                <Link href={`/chat/${groupId}/notebook`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1 rounded-lg px-2 hover:bg-emerald-500/10 whitespace-nowrap"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    المفكرة
                  </Button>
                </Link>
              )}

              {memoryEnabled && (
                <Link href={`/chat/${groupId}/memory`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1 rounded-lg px-2 hover:bg-purple-500/10 whitespace-nowrap"
                  >
                    <Brain className="w-3.5 h-3.5 text-purple-600" />
                    الذاكرة
                  </Button>
                </Link>
              )}

              {decisionsEnabled && (
                <Link href={`/chat/${groupId}/decisions`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1 rounded-lg px-2 hover:bg-amber-500/10 whitespace-nowrap"
                  >
                    <Vote className="w-3.5 h-3.5 text-amber-600" />
                    القرارات
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
