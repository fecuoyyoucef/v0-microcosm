"use client"
import { useState, useRef, useEffect, useCallback } from "react"
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

const NODE_COLORS = [
  { bg: "#3B82F6", light: "#DBEAFE" },
  { bg: "#10B981", light: "#D1FAE5" },
  { bg: "#F59E0B", light: "#FEF3C7" },
  { bg: "#EF4444", light: "#FEE2E2" },
  { bg: "#8B5CF6", light: "#EDE9FE" },
  { bg: "#EC4899", light: "#FCE7F3" },
  { bg: "#06B6D4", light: "#CFFAFE" },
]

export function ConversationMap({ groupId, group, nodes: initialNodes, currentUserId }: ConversationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [selectedNode, setSelectedNode] = useState<ConversationNode | null>(null)
  const [nodeMessages, setNodeMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newNodeTitle, setNewNodeTitle] = useState("")
  const [newNodeDescription, setNewNodeDescription] = useState("")
  const [newNodeParent, setNewNodeParent] = useState<string | null>(null)
  const [newNodeColor, setNewNodeColor] = useState(NODE_COLORS[0].bg)
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [localNodes, setLocalNodes] = useState<ConversationNode[]>(initialNodes)
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

          if (data) {
            setLocalNodes(data)
          }
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

  const buildHierarchy = (nodes: ConversationNode[]) => {
    const rootNodes = nodes.filter((n) => !n.parent_id)
    if (rootNodes.length === 0) return null

    const nodeMap = new Map(nodes.map((n) => [n.id, { ...n, children: [] as ConversationNode[] }]))

    nodes.forEach((node) => {
      if (node.parent_id) {
        const parent = nodeMap.get(node.parent_id)
        const child = nodeMap.get(node.id)
        if (parent && child) {
          parent.children.push(child)
        }
      }
    })

    if (rootNodes.length === 1) {
      return nodeMap.get(rootNodes[0].id)
    }

    return {
      id: "virtual-root",
      title: group.name,
      color: "#6366f1",
      messages_count: 0,
      children: rootNodes.map((r) => nodeMap.get(r.id)).filter(Boolean),
    }
  }

  const fitToScreen = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity)
  }, [])

  const zoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.3)
  }, [])

  const zoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(zoomRef.current.scaleBy, 0.7)
  }, [])

  useEffect(() => {
    if (!svgRef.current || localNodes.length === 0) return

    const width = containerSize.width
    const height = containerSize.height

    d3.select(svgRef.current).selectAll("*").remove()

    const hierarchyData = buildHierarchy(localNodes)
    if (!hierarchyData) return

    const root = d3.hierarchy(hierarchyData as ConversationNode)

    // RTL layout - tree grows from right to left
    const treeLayout = d3.tree<ConversationNode>().nodeSize([100, 220])
    treeLayout(root)

    // Calculate bounds to center the tree
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    root.descendants().forEach(d => {
      if (d.x < minX) minX = d.x
      if (d.x > maxX) maxX = d.x
      if (d.y < minY) minY = d.y
      if (d.y > maxY) maxY = d.y
    })

    const treeWidth = maxY - minY + 300
    const treeHeight = maxX - minX + 150
    const scale = Math.min(width / treeWidth, height / treeHeight, 1) * 0.85
    const offsetX = width / 2 + (maxY + minY) / 2 * scale
    const offsetY = height / 2 - (maxX + minX) / 2 * scale

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)

    // Create gradient definitions
    const defs = svg.append("defs")
    
    // Add drop shadow filter
    const filter = defs.append("filter")
      .attr("id", "node-shadow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%")
    
    filter.append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 4)
      .attr("stdDeviation", 8)
      .attr("flood-color", "rgba(0,0,0,0.1)")

    const g = svg.append("g")
      .attr("transform", `translate(${offsetX}, ${offsetY}) scale(${scale})`)

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })

    zoomRef.current = zoom
    svg.call(zoom)
    
    // Set initial transform
    svg.call(zoom.transform, d3.zoomIdentity.translate(offsetX, offsetY).scale(scale))

    const nodes = root.descendants()
    const links = root.links()

    // Draw curved links (RTL: negative y for x position)
    g.selectAll(".link")
      .data(links)
      .join("path")
      .attr("class", "link")
      .attr("d", (d) => {
        const sourceX = -d.source.y
        const sourceY = d.source.x
        const targetX = -d.target.y
        const targetY = d.target.x
        const midX = (sourceX + targetX) / 2
        return `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`
      })
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const color = (d.target.data as ConversationNode).color || "#64748b"
        return color
      })
      .attr("stroke-width", 3)
      .attr("stroke-opacity", 0.4)
      .attr("stroke-linecap", "round")

    // Draw nodes
    const nodeGroups = g.selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${-d.y},${d.x})`)
      .attr("cursor", "pointer")
      .on("click", (_event, d) => {
        if ((d.data as ConversationNode).id !== "virtual-root") {
          handleNodeClick(d.data as ConversationNode)
        }
      })

    // Node card background with shadow
    nodeGroups.append("rect")
      .attr("width", 160)
      .attr("height", 70)
      .attr("x", -80)
      .attr("y", -35)
      .attr("rx", 16)
      .attr("fill", (d) => {
        const nodeData = d.data as ConversationNode
        const colorObj = NODE_COLORS.find(c => c.bg === nodeData.color)
        return colorObj?.light || "#F1F5F9"
      })
      .attr("stroke", (d) => (d.data as ConversationNode).color || "#3b82f6")
      .attr("stroke-width", 2.5)
      .attr("filter", "url(#node-shadow)")
      .on("mouseenter", function() {
        d3.select(this).transition().duration(150)
          .attr("stroke-width", 4)
      })
      .on("mouseleave", function(event, d) {
        const isSelected = selectedNode?.id === (d.data as ConversationNode).id
        d3.select(this).transition().duration(150)
          .attr("stroke-width", isSelected ? 4 : 2.5)
      })

    // Selected state highlight
    nodeGroups.filter(d => selectedNode?.id === (d.data as ConversationNode).id)
      .select("rect")
      .attr("stroke-width", 4)

    // Node title
    nodeGroups.append("text")
      .attr("dy", (d) => (d.data as ConversationNode).messages_count > 0 ? -2 : 5)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("font-weight", "600")
      .attr("fill", (d) => (d.data as ConversationNode).color || "#1E293B")
      .attr("font-family", "system-ui, -apple-system, sans-serif")
      .text((d) => {
        const title = (d.data as ConversationNode).title || ""
        return title.length > 14 ? title.substring(0, 12) + "..." : title
      })

    // Message count badge
    nodeGroups.filter((d) => (d.data as ConversationNode).messages_count > 0)
      .append("g")
      .attr("transform", "translate(0, 18)")
      .call(g => {
        g.append("rect")
          .attr("width", 50)
          .attr("height", 22)
          .attr("x", -25)
          .attr("y", -11)
          .attr("rx", 11)
          .attr("fill", (d) => (d.data as ConversationNode).color || "#3b82f6")
        
        g.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", 4)
          .attr("font-size", 11)
          .attr("font-weight", "700")
          .attr("fill", "white")
          .text((d) => `${(d.data as ConversationNode).messages_count} رسالة`)
      })

    return () => {
      svg.selectAll("*").remove()
    }
  }, [localNodes, selectedNode?.id, containerSize, group.name])

  const filteredNodes = searchQuery
    ? localNodes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : localNodes

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
                        key={color.bg}
                        onClick={() => setNewNodeColor(color.bg)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-transform",
                          newNodeColor === color.bg && "ring-2 ring-offset-2 ring-primary scale-110",
                        )}
                        style={{ backgroundColor: color.bg }}
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
          style={{ 
            background: "radial-gradient(circle at 50% 50%, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 70%)"
          }}
        >
          <svg ref={svgRef} className="w-full h-full" />
          
          {/* Zoom controls */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-1 bg-card/90 backdrop-blur-sm rounded-lg border border-border p-1 shadow-lg">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="h-px bg-border my-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fitToScreen}>
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
