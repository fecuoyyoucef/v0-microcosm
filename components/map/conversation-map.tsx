"use client"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import * as d3 from "d3"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, ChevronLeft, Hash, Loader2, Search, X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import Link from "next/link"
import type { ConversationNode, Group, Message } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ConversationMapProps {
  groupId: string
  group: Group
  nodes: ConversationNode[]
  currentUserId: string
}

const NODE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"]

// Visual constants matching the NotebookLM reference
const NODE_WIDTH = 200
const NODE_HEIGHT = 56
const NODE_RADIUS = 14
const TOGGLE_RADIUS = 14
const TOGGLE_GAP = 10 // gap between node edge and toggle button
const LEVEL_GAP = 280 // horizontal distance between levels
const SIBLING_GAP = 24 // vertical gap between siblings

const NODE_FILL = "#2C3540" // dark slate, matches reference
const NODE_FILL_ROOT = "#574F6E" // lavender root, matches reference
const NODE_TEXT = "#FFFFFF"
const LINK_COLOR = "#A8B5E8" // soft lavender-blue
const BG_COLOR = "#FAFAF7" // warm off-white background
const TOGGLE_FILL = "#2C3540"

interface HierarchyNodeData {
  id: string
  title: string
  color?: string
  messages_count?: number
  description?: string | null
  children?: HierarchyNodeData[]
  _raw?: ConversationNode
}

export function ConversationMap({ groupId, group, nodes: initialNodes, currentUserId }: ConversationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const gRef = useRef<SVGGElement | null>(null)
  const [selectedNode, setSelectedNode] = useState<ConversationNode | null>(null)
  const [nodeMessages, setNodeMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newNodeTitle, setNewNodeTitle] = useState("")
  const [newNodeDescription, setNewNodeDescription] = useState("")
  const [newNodeParent, setNewNodeParent] = useState<string | null>(null)
  const [newNodeColor, setNewNodeColor] = useState(NODE_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [localNodes, setLocalNodes] = useState<ConversationNode[]>(initialNodes)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const supabase = createClient()
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }
    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  useEffect(() => {
    setLocalNodes(initialNodes)
  }, [initialNodes])

  useEffect(() => {
    const channel = supabase
      .channel(`nodes-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_nodes",
          filter: `group_id=eq.${groupId}`,
        },
        async () => {
          const { data } = await supabase
            .from("conversation_nodes")
            .select("*")
            .eq("group_id", groupId)
            .order("created_at", { ascending: true })
          if (data) setLocalNodes(data)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, supabase])

  const createNode = async () => {
    if (!newNodeTitle.trim()) return
    setIsCreating(true)
    try {
      const { error } = await supabase.from("conversation_nodes").insert({
        group_id: groupId,
        title: newNodeTitle.trim(),
        description: newNodeDescription.trim() || null,
        parent_id: newNodeParent,
        color: newNodeColor,
        position_x: 0,
        position_y: 0,
        created_by: currentUserId,
      })
      if (!error) {
        setNewNodeTitle("")
        setNewNodeDescription("")
        setNewNodeParent(null)
        setIsCreateOpen(false)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleNodeClick = async (node: ConversationNode) => {
    setSelectedNode(node)
    setIsLoadingMessages(true)
    try {
      const { data: messagesData } = await supabase
        .from("messages")
        .select("*")
        .eq("node_id", node.id)
        .order("created_at", { ascending: true })
      if (messagesData && messagesData.length > 0) {
        const senderIds = [...new Set(messagesData.map((m) => m.sender_id))]
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", senderIds)
        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])
        const messagesWithSender = messagesData.map((m) => ({
          ...m,
          sender: profileMap.get(m.sender_id) || null,
        }))
        setNodeMessages(messagesWithSender as Message[])
      } else {
        setNodeMessages([])
      }
    } catch (error) {
      console.error("Error loading node messages:", error)
      setNodeMessages([])
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Build hierarchy, respecting collapsed state
  const hierarchyData = useMemo<HierarchyNodeData | null>(() => {
    if (localNodes.length === 0) return null

    const rootNodes = localNodes.filter((n) => !n.parent_id)

    const buildChildren = (parentId: string): HierarchyNodeData[] => {
      return localNodes
        .filter((n) => n.parent_id === parentId)
        .map((n) => ({
          id: n.id,
          title: n.title,
          color: n.color,
          messages_count: n.messages_count,
          description: n.description,
          _raw: n,
          children: collapsedIds.has(n.id) ? undefined : buildChildren(n.id),
        }))
    }

    return {
      id: "virtual-root",
      title: group.name,
      color: NODE_FILL_ROOT,
      children: rootNodes.map((r) => ({
        id: r.id,
        title: r.title,
        color: r.color,
        messages_count: r.messages_count,
        description: r.description,
        _raw: r,
        children: collapsedIds.has(r.id) ? undefined : buildChildren(r.id),
      })),
    }
  }, [localNodes, collapsedIds, group.name])

  // Determine which nodes have hidden children (collapsed) vs visible children (expandable indicator)
  const childCountMap = useMemo(() => {
    const map = new Map<string, number>()
    localNodes.forEach((n) => {
      const count = localNodes.filter((x) => x.parent_id === n.id).length
      map.set(n.id, count)
    })
    return map
  }, [localNodes])

  const fitToScreen = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || !gRef.current) return
    const svg = d3.select(svgRef.current)
    const bounds = gRef.current.getBBox()
    const width = containerSize.width
    const height = containerSize.height
    const scale = Math.min(width / (bounds.width + 100), height / (bounds.height + 100), 1.2)
    const tx = width / 2 - (bounds.x + bounds.width / 2) * scale
    const ty = height / 2 - (bounds.y + bounds.height / 2) * scale
    svg.transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))
  }, [containerSize])

  const zoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, 1.3)
  }, [])

  const zoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, 0.7)
  }, [])

  // Main render effect
  useEffect(() => {
    if (!svgRef.current || !hierarchyData) return

    const width = containerSize.width
    const height = containerSize.height
    const svgSel = d3.select(svgRef.current)
    svgSel.selectAll("*").remove()

    // Filter definitions
    const defs = svgSel.append("defs")
    const filter = defs.append("filter")
      .attr("id", "soft-shadow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%")
    filter.append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 2)
      .attr("stdDeviation", 3)
      .attr("flood-color", "rgba(0,0,0,0.12)")

    svgSel.attr("width", width).attr("height", height)

    const g = svgSel.append("g")
    gRef.current = g.node()

    // Tree layout: LTR, root on left
    const root = d3.hierarchy<HierarchyNodeData>(hierarchyData)
    const treeLayout = d3
      .tree<HierarchyNodeData>()
      .nodeSize([NODE_HEIGHT + SIBLING_GAP, LEVEL_GAP])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.3))

    treeLayout(root)

    // After layout: d.x is vertical position, d.y is horizontal
    // Compute bounds for centering
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    root.descendants().forEach((d) => {
      if (d.x < minX) minX = d.x
      if (d.x > maxX) maxX = d.x
      if (d.y < minY) minY = d.y
      if (d.y > maxY) maxY = d.y
    })

    const treeW = maxY - minY + NODE_WIDTH + TOGGLE_RADIUS * 2 + 40
    const treeH = maxX - minX + NODE_HEIGHT + 40
    const scale = Math.min(width / treeW, height / treeH, 1)
    const tx = width / 2 - ((minY + maxY) / 2) * scale
    const ty = height / 2 - ((minX + maxX) / 2) * scale

    // Setup zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString())
      })
    zoomRef.current = zoom
    svgSel.call(zoom)
    svgSel.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))

    // Draw links as smooth bezier curves
    const linksLayer = g.append("g").attr("class", "links")
    linksLayer
      .selectAll("path")
      .data(root.links())
      .join("path")
      .attr("d", (d) => {
        // Source connection point: right edge of source node + toggle button
        const sx = d.source.y + NODE_WIDTH / 2 + TOGGLE_GAP + TOGGLE_RADIUS
        const sy = d.source.x
        // Target connection point: left edge of target node
        const tx2 = d.target.y - NODE_WIDTH / 2
        const ty2 = d.target.x
        const midX = (sx + tx2) / 2
        return `M${sx},${sy} C${midX},${sy} ${midX},${ty2} ${tx2},${ty2}`
      })
      .attr("fill", "none")
      .attr("stroke", LINK_COLOR)
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round")
      .attr("opacity", 0)
      .transition()
      .duration(400)
      .attr("opacity", 0.7)

    // Draw nodes
    const nodesLayer = g.append("g").attr("class", "nodes")
    const nodeGroups = nodesLayer
      .selectAll("g.node")
      .data(root.descendants(), (d) => (d as d3.HierarchyNode<HierarchyNodeData>).data.id)
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .style("opacity", 0)

    nodeGroups.transition().duration(400).style("opacity", 1)

    // Node rectangle
    nodeGroups
      .append("rect")
      .attr("x", -NODE_WIDTH / 2)
      .attr("y", -NODE_HEIGHT / 2)
      .attr("width", NODE_WIDTH)
      .attr("height", NODE_HEIGHT)
      .attr("rx", NODE_RADIUS)
      .attr("ry", NODE_RADIUS)
      .attr("fill", (d) => (d.data.id === "virtual-root" ? NODE_FILL_ROOT : NODE_FILL))
      .attr("stroke", (d) => (selectedNode?.id === d.data.id ? d.data.color || LINK_COLOR : "transparent"))
      .attr("stroke-width", 3)
      .attr("filter", "url(#soft-shadow)")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation()
        if (d.data._raw) handleNodeClick(d.data._raw)
      })
      .on("mouseenter", function () {
        d3.select(this).transition().duration(120).attr("transform", "scale(1.03)")
      })
      .on("mouseleave", function () {
        d3.select(this).transition().duration(120).attr("transform", "scale(1)")
      })

    // Node title text
    nodeGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", 14)
      .attr("font-weight", 500)
      .attr("fill", NODE_TEXT)
      .attr("pointer-events", "none")
      .style("font-family", "system-ui, -apple-system, sans-serif")
      .text((d) => {
        const t = d.data.title || ""
        return t.length > 22 ? t.substring(0, 20) + "…" : t
      })

    // Toggle indicator on the right of each node that has children
    const togglesLayer = g.append("g").attr("class", "toggles")
    const toggleGroups = togglesLayer
      .selectAll("g.toggle")
      .data(
        root.descendants().filter((d) => {
          if (d.data.id === "virtual-root") return (d.children?.length || 0) > 0
          const realCount = childCountMap.get(d.data.id) || 0
          return realCount > 0
        }),
      )
      .join("g")
      .attr("class", "toggle")
      .attr("transform", (d) => `translate(${d.y + NODE_WIDTH / 2 + TOGGLE_GAP + TOGGLE_RADIUS},${d.x})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation()
        if (d.data.id !== "virtual-root") toggleCollapse(d.data.id)
      })

    toggleGroups
      .append("circle")
      .attr("r", TOGGLE_RADIUS)
      .attr("fill", TOGGLE_FILL)
      .attr("filter", "url(#soft-shadow)")

    toggleGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", 16)
      .attr("font-weight", 600)
      .attr("fill", NODE_TEXT)
      .attr("pointer-events", "none")
      .text((d) => {
        const isCollapsed = collapsedIds.has(d.data.id)
        // `<` indicates expanded (showing children), `>` indicates collapsed (can expand)
        return isCollapsed ? ">" : "<"
      })

    // Message count badge (small pill below title, only if has messages)
    nodeGroups
      .filter((d) => (d.data.messages_count || 0) > 0)
      .each(function (d) {
        const sel = d3.select(this)
        const count = d.data.messages_count || 0
        const text = `${count}`
        const badgeR = 9
        sel
          .append("circle")
          .attr("cx", NODE_WIDTH / 2 - 14)
          .attr("cy", -NODE_HEIGHT / 2 + 14)
          .attr("r", badgeR)
          .attr("fill", d.data.color || LINK_COLOR)
        sel
          .append("text")
          .attr("x", NODE_WIDTH / 2 - 14)
          .attr("y", -NODE_HEIGHT / 2 + 14)
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("font-size", 10)
          .attr("font-weight", 700)
          .attr("fill", "#FFFFFF")
          .attr("pointer-events", "none")
          .text(text)
      })
  }, [hierarchyData, containerSize, collapsedIds, selectedNode?.id, childCountMap, toggleCollapse])

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="h-14 border-b border-border px-3 md:px-4 flex items-center justify-between bg-card/50 shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Link href={`/chat/${groupId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <Hash className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium truncate">{group.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث في العقد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 pr-9 h-8 bg-background"
            />
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="w-4 h-4 md:ml-1" />
                <span className="hidden md:inline">عقدة جديدة</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء عقدة جديدة</DialogTitle>
                <DialogDescription>أضف موضوعاً أو فكرة جديدة للخريطة</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input
                    value={newNodeTitle}
                    onChange={(e) => setNewNodeTitle(e.target.value)}
                    placeholder="مثال: التخطيط للرحلة"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الوصف (اختياري)</Label>
                  <Textarea
                    value={newNodeDescription}
                    onChange={(e) => setNewNodeDescription(e.target.value)}
                    placeholder="وصف مختصر للموضوع..."
                    className="bg-background resize-none"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>العقدة الأب (اختياري)</Label>
                  <select
                    value={newNodeParent || ""}
                    onChange={(e) => setNewNodeParent(e.target.value || null)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">بدون (عقدة رئيسية)</option>
                    {localNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>اللون</Label>
                  <div className="flex gap-2 flex-wrap">
                    {NODE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewNodeColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-transform",
                          newNodeColor === color && "ring-2 ring-offset-2 ring-primary scale-110",
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={createNode} disabled={!newNodeTitle.trim() || isCreating} className="w-full">
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    "إنشاء العقدة"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative"
          style={{ background: BG_COLOR }}
          dir="ltr"
        >
          <svg ref={svgRef} className="w-full h-full" />

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-1 bg-card/95 backdrop-blur-sm rounded-lg border border-border p-1 shadow-md">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn} aria-label="تكبير">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut} aria-label="تصغير">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="h-px bg-border my-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fitToScreen} aria-label="ملء الشاشة">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {selectedNode && (
          <div className="w-72 md:w-80 border-r border-border bg-card flex flex-col shrink-0 h-full overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedNode.color }} />
                <h3 className="font-bold truncate">{selectedNode.title}</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedNode(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {selectedNode.description && (
              <p className="px-4 py-3 text-sm text-muted-foreground border-b border-border shrink-0">
                {selectedNode.description}
              </p>
            )}

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="px-4 py-2 flex items-center justify-between border-b border-border shrink-0">
                <span className="text-sm font-medium">الرسائل المرتبطة</span>
                <span className="text-xs text-muted-foreground">{nodeMessages.length} رسالة</span>
              </div>

              <ScrollArea className="flex-1">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : nodeMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm px-4">
                    لا توجد رسائل مرتبطة بهذه العقدة
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {nodeMessages.map((message) => (
                      <div key={message.id} className="p-3 rounded-lg bg-secondary">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={message.sender?.avatar_url || undefined} className="object-cover" />
                            <AvatarFallback className="text-xs">
                              {message.sender?.display_name?.charAt(0) || "؟"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{message.sender?.display_name || "مستخدم"}</span>
                          <span className="text-xs text-muted-foreground mr-auto">
                            {new Date(message.created_at).toLocaleTimeString("ar", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
