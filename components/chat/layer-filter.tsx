"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Layers, GitBranch, X, Map, BookOpen, Brain, Vote, ChevronDown, ChevronUp, Filter } from "lucide-react"
import type { MessageLayer, ConversationNode } from "@/lib/types"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useParams } from "next/navigation"

interface LayerFilterProps {
  activeLayer: MessageLayer | "all"
  onLayerChange: (layer: MessageLayer | "all") => void
  nodes?: ConversationNode[]
  selectedNodeId?: string | null
  onNodeChange?: (nodeId: string | null) => void
}

export function LayerFilter({
  activeLayer,
  onLayerChange,
  nodes = [],
  selectedNodeId,
  onNodeChange,
}: LayerFilterProps) {
  const params = useParams()
  const groupId = params.groupId as string
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const [isExpanded, setIsExpanded] = useState(false)

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
    <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">الأدوات</span>
          {!isExpanded && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {getFilterSummary()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Quick access icons when collapsed */}
          {!isExpanded && (
            <div className="flex items-center gap-1 mr-2">
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
          "overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide max-w-3xl mx-auto">
            {/* Layer Filters */}
            <div className="flex items-center gap-1 shrink-0 bg-muted/50 rounded-xl p-1">
              <Button
                variant={activeLayer === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onLayerChange("all")}
                className={cn("h-8 text-xs gap-1.5 rounded-lg px-3", activeLayer === "all" && "shadow-sm")}
              >
                <Layers className="w-3.5 h-3.5" />
                الكل
              </Button>

              <Button
                variant={activeLayer === "upper" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onLayerChange("upper")}
                className={cn(
                  "h-8 text-xs gap-1.5 rounded-lg px-3",
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
                className={cn("h-8 text-xs gap-1.5 rounded-lg px-3", activeLayer === "standard" && "shadow-sm")}
              >
                <span>⚪</span>
                عادي
              </Button>

              <Button
                variant={activeLayer === "shadow" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onLayerChange("shadow")}
                className={cn(
                  "h-8 text-xs gap-1.5 rounded-lg px-3",
                  activeLayer === "shadow" && "bg-gray-200 dark:bg-gray-800 shadow-sm",
                )}
              >
                <span>🔘</span>
                ظل
              </Button>
            </div>

            <div className="w-px h-6 bg-border shrink-0" />

            {/* Quick Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Link href={`/chat/${groupId}/map`}>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-lg px-3 hover:bg-primary/10">
                  <Map className="w-3.5 h-3.5 text-primary" />
                  الخريطة
                </Button>
              </Link>

              <Link href={`/chat/${groupId}/notebook`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 rounded-lg px-3 hover:bg-emerald-500/10"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  المفكرة
                </Button>
              </Link>

              <Link href={`/chat/${groupId}/memory`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 rounded-lg px-3 hover:bg-purple-500/10"
                >
                  <Brain className="w-3.5 h-3.5 text-purple-600" />
                  الذاكرة
                </Button>
              </Link>

              <Link href={`/chat/${groupId}/decisions`}>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-lg px-3 hover:bg-amber-500/10">
                  <Vote className="w-3.5 h-3.5 text-amber-600" />
                  القرارات
                </Button>
              </Link>
            </div>

            {/* Node Filter */}
            {nodes.length > 0 && onNodeChange && (
              <>
                <div className="w-px h-6 bg-border shrink-0" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={selectedNodeId ? "secondary" : "ghost"}
                      size="sm"
                      className={cn("h-8 text-xs gap-1.5 rounded-lg px-3", selectedNodeId && "shadow-sm")}
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      {selectedNode ? selectedNode.title : "العقد"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-64 overflow-auto">
                    <DropdownMenuItem onClick={() => onNodeChange(null)}>
                      <Layers className="w-3.5 h-3.5 ml-2" />
                      كل العقد
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {nodes.map((node) => (
                      <DropdownMenuItem
                        key={node.id}
                        onClick={() => onNodeChange(node.id)}
                        className={cn(selectedNodeId === node.id && "bg-secondary")}
                      >
                        <div className="w-3 h-3 rounded-full ml-2" style={{ backgroundColor: node.color }} />
                        {node.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedNodeId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full shrink-0"
                    onClick={() => onNodeChange(null)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
