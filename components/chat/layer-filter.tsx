"use client"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Layers,
  Map,
  BookOpen,
  Brain,
  Vote,
  GitBranch,
  Search,
  BarChart,
  Sparkles,
  FileText,
  TrendingUp,
  Archive,
} from "lucide-react"
import type { MessageLayer, ConversationNode } from "@/lib/types"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useParams } from "next/navigation"
import { NodesPanel } from "./nodes-panel"
import { useState } from "react"

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
  const [isNodesPanelOpen, setIsNodesPanelOpen] = useState(false)

  return (
    <div className="shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-xl w-full">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 px-3 py-2 min-w-max">
          {/* الطبقات */}
          <Button
            variant={activeLayer === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onLayerChange("all")}
            className={cn("h-8 text-xs gap-1.5 rounded-full", activeLayer === "all" && "shadow-sm")}
          >
            <Layers className="w-3.5 h-3.5" />
            الكل
          </Button>

          <Button
            variant={activeLayer === "upper" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onLayerChange("upper")}
            className={cn(
              "h-8 text-xs gap-1.5 rounded-full",
              activeLayer === "upper" && "bg-orange-100 dark:bg-orange-900/40 shadow-sm",
            )}
          >
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            مهم
          </Button>

          <Button
            variant={activeLayer === "standard" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onLayerChange("standard")}
            className={cn("h-8 text-xs gap-1.5 rounded-full", activeLayer === "standard" && "shadow-sm")}
          >
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            عادي
          </Button>

          <Button
            variant={activeLayer === "shadow" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onLayerChange("shadow")}
            className={cn(
              "h-8 text-xs gap-1.5 rounded-full",
              activeLayer === "shadow" && "bg-gray-200 dark:bg-gray-800 shadow-sm",
            )}
          >
            <span className="w-2 h-2 rounded-full bg-gray-600" />
            ظل
          </Button>

          {/* فاصل */}
          <div className="w-px h-6 bg-border/50 mx-1" />

          {/* الأدوات - إزالة شروط Feature Flags لإظهار جميع الأدوات دائماً */}
          <Link href={`/chat/${groupId}/decisions`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-amber-500/10">
              <Vote className="w-3.5 h-3.5 text-amber-600" />
              القرارات
            </Button>
          </Link>

          <Sheet open={isNodesPanelOpen} onOpenChange={setIsNodesPanelOpen}>
            <SheetTrigger asChild>
              <Button
                variant={selectedNodeId ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs gap-1.5 rounded-full hover:bg-violet-500/10"
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
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-cyan-500/10">
              <Map className="w-3.5 h-3.5 text-cyan-600" />
              الخريطة
            </Button>
          </Link>

          <Link href={`/chat/${groupId}/notebook`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-emerald-500/10">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              المفكرة
            </Button>
          </Link>

          <Link href={`/chat/${groupId}/memory`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-purple-500/10">
              <Brain className="w-3.5 h-3.5 text-purple-600" />
              الذاكرة
            </Button>
          </Link>

          <Link href={`/chat/${groupId}/archive`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-stone-500/10">
              <Archive className="w-3.5 h-3.5 text-stone-600" />
              الأرشيف
            </Button>
          </Link>

          <Link href={`/chat/${groupId}/summary`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-blue-500/10">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              الملخص
            </Button>
          </Link>

          <Link href={`/chat/${groupId}/quality`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-green-500/10">
              <TrendingUp className="w-3.5 h-3.5 text-green-600" />
              جودة النقاش
            </Button>
          </Link>

          <Link href={`/chat/${groupId}/search`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-blue-500/10">
              <Search className="w-3.5 h-3.5 text-blue-600" />
              البحث
            </Button>
          </Link>

          <Link href={`/chat/${groupId}/analytics`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-pink-500/10">
              <BarChart className="w-3.5 h-3.5 text-pink-600" />
              التحليلات
            </Button>
          </Link>

          <Link href={`/chat/${groupId}/assistant`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-yellow-500/10">
              <Sparkles className="w-3.5 h-3.5 text-yellow-600" />
              المساعد
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
