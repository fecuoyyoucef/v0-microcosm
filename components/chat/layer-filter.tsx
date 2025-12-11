"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Layers, Map, BookOpen, Brain, Vote, ChevronDown, ChevronUp, Filter, GitBranch } from "lucide-react"
import type { MessageLayer, ConversationNode } from "@/lib/types"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useParams } from "next/navigation"
import { NodesPanel } from "./nodes-panel"

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
}: LayerFilterProps) {
  const params = useParams()
  const groupId = propGroupId || (params.groupId as string)
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isNodesPanelOpen, setIsNodesPanelOpen] = useState(false)

  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const [isFirstVisit, setIsFirstVisit] = useState(false)

  useEffect(() => {
    const hasSeenToolbar = localStorage.getItem("hasSeenToolbarTour")
    if (!hasSeenToolbar) {
      setIsFirstVisit(true)
      // Show first tooltip after a delay
      setTimeout(() => setShowTooltip("tools"), 1000)
    }
  }, [])

  const dismissTooltip = () => {
    setShowTooltip(null)
    localStorage.setItem("hasSeenToolbarTour", "true")
    setIsFirstVisit(false)
  }

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
    <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm w-full">
      {showTooltip === "tools" && (
        <div className="absolute top-16 right-4 z-50 bg-primary text-primary-foreground p-3 rounded-lg shadow-lg max-w-[250px] animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-medium mb-1">شريط الأدوات</p>
          <p className="text-xs opacity-90">
            اضغط هنا لفتح الأدوات المتقدمة: الطبقات، الخريطة الذهنية، المفكرة والمزيد
          </p>
          <button onClick={dismissTooltip} className="text-xs underline mt-2 block">
            فهمت
          </button>
          <div className="absolute -top-2 right-4 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-primary" />
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium shrink-0">الأدوات</span>
          {!isExpanded && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full truncate max-w-[120px]">
              {getFilterSummary()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isExpanded && (
            <div className="flex items-center gap-1 mr-2">
              {/* Nodes Panel Trigger */}
              <Sheet open={isNodesPanelOpen} onOpenChange={setIsNodesPanelOpen}>
                <SheetTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <div className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer">
                    <GitBranch className="w-3.5 h-3.5 text-violet-600" />
                  </div>
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
              <Link href={`/chat/${groupId}/map`} onClick={(e) => e.stopPropagation()}>
                <div className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center">
                  <Map className="w-3.5 h-3.5 text-primary" />
                </div>
              </Link>
              <Link href={`/chat/${groupId}/notebook`} onClick={(e) => e.stopPropagation()}>
                <div className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              </Link>
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <div
        className={cn(
          "transition-all duration-200",
          isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0 overflow-hidden",
        )}
      >
        <div className="px-3 pb-3 w-full">
          <div className="overflow-x-auto scrollbar-hide -mx-3 px-3">
            <div className="flex items-center gap-2 w-max">
              {/* Layer Filters */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
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

              {/* Quick Actions */}
              <div className="flex items-center gap-1">
                {/* Nodes Panel */}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
