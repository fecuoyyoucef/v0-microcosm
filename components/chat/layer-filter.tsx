"use client"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  SparklesIcon,
  MapPinIcon,
  BookOpenIcon,
  LightBulbIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/solid"
import type { MessageLayer, ConversationNode } from "@/lib/types"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useParams } from "next/navigation"
import { NodesPanel } from "./nodes-panel"
import { useState, useEffect } from "react"

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
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedState = localStorage.getItem(`toolbar-collapsed-${groupId}`)
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState))
    }
  }, [groupId])

  const handleToggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    if (mounted) {
      localStorage.setItem(`toolbar-collapsed-${groupId}`, JSON.stringify(newState))
    }
  }

  return (
    <div className="shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-xl w-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="text-xs font-medium text-muted-foreground">الأدوات</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleCollapse}
          className="h-6 w-6 p-0 hover:bg-secondary transition-all duration-200"
        >
          {isCollapsed ? (
            <ArrowTrendingUpIcon className="w-4 h-4 transition-transform duration-200" />
          ) : (
            <ArrowTrendingUpIcon className="w-4 h-4 transition-transform duration-200" />
          )}
        </Button>
      </div>

      <div
        className={cn("overflow-hidden transition-all duration-300 ease-in-out", isCollapsed ? "max-h-0" : "max-h-12")}
      >
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 px-3 py-2 min-w-max">
            <Button
              variant={activeLayer === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onLayerChange("all")}
              className={cn("h-8 text-xs gap-1.5 rounded-full", activeLayer === "all" && "shadow-sm")}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h12v2H6V4zm0 7h12v2H6v-2zm0 7h12v2H6v-2z" />
              </svg>
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

            <div className="w-px h-6 bg-border/50 mx-1" />

            <Link href={`/chat/${groupId}/decisions`}>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-amber-500/10">
                <CheckCircleIcon className="w-3.5 h-3.5 text-amber-600" />
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
                  <CodeBracketIcon className="w-3.5 h-3.5 text-violet-600" />
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
                <MapPinIcon className="w-3.5 h-3.5 text-cyan-600" />
                الخريطة
              </Button>
            </Link>

            <Link href={`/chat/${groupId}/notebook`}>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-emerald-500/10">
                <BookOpenIcon className="w-3.5 h-3.5 text-emerald-600" />
                المفكرة
              </Button>
            </Link>

            <Link href={`/chat/${groupId}/memory`}>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-purple-500/10">
                <LightBulbIcon className="w-3.5 h-3.5 text-purple-600" />
                الذاكرة
              </Button>
            </Link>

            <Link href={`/chat/${groupId}/archive`}>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-stone-500/10">
                <ArchiveBoxIcon className="w-3.5 h-3.5 text-stone-600" />
                الأرشيف
              </Button>
            </Link>

            <Link href={`/chat/${groupId}/summary`}>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-blue-500/10">
                <DocumentTextIcon className="w-3.5 h-3.5 text-blue-600" />
                الملخص
              </Button>
            </Link>

            <Link href={`/chat/${groupId}/quality`}>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-green-500/10">
                <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-green-600" />
                جودة النقاش
              </Button>
            </Link>

            <Link href={`/chat/${groupId}/search`}>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-blue-500/10">
                <MagnifyingGlassIcon className="w-3.5 h-3.5 text-blue-600" />
                البحث
              </Button>
            </Link>

            <Link href={`/chat/${groupId}/analytics`}>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-pink-500/10">
                <ChartBarIcon className="w-3.5 h-3.5 text-pink-600" />
                التحليلات
              </Button>
            </Link>

            <Link href={`/chat/${groupId}/assistant`}>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 rounded-full hover:bg-yellow-500/10">
                <SparklesIcon className="w-3.5 h-3.5 text-yellow-600" />
                المساعد
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
