"use client"
import { useState, useRef, useEffect } from "react"
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
import { Plus, Maximize, ChevronLeft, Hash, Loader2, Search, X } from "lucide-react"
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

export function ConversationMap({ groupId, group, nodes: initialNodes, currentUserId }: ConversationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<ConversationNode | null>(null)
  const [nodeMessages, setNodeMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newNodeTitle, setNewNodeTitle] = useState("")
  const [newNodeDescription, setNewNodeDescription] = useState("")
  const [newNodeParent, setNewNodeParent] = useState<string | null>(null)
  const [newNodeColor, setNewNodeColor] = useState(NODE_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [localNodes, setLocalNodes] = useState<ConversationNode[]>(initialNodes)
  const supabase = createClient()
  const simulationRef = useRef<d3.Simulation<ConversationNode, undefined> | null>(null)
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

  useEffect(() => {
    if (!svgRef.current || localNodes.length === 0) return

    const width = containerSize.width
    const height = containerSize.height

    d3.select(svgRef.current).selectAll("*").remove()

    const links = localNodes
      .filter((n) => n.parent_id)
      .map((n) => ({
        source: n.parent_id!,
        target: n.id,
      }))

    const simulation = d3
      .forceSimulation(localNodes as any)
      .force(
        "link",
        d3
          .forceLink(links as any)
          .id((d: any) => d.id)
          .distance(150)
          .strength(0.5),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(80))

    simulationRef.current = simulation

    const svg = d3.select(svgRef.current).attr("width", width).attr("height", height)

    const zoomBehavior = d3.zoom().on("zoom", (event) => {
      svg.attr("transform", event.transform)
      setZoom(event.transform.k)
    })

    svg.call(zoomBehavior as any)

    const g = svg.append("g")

    const linkLines = g
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: any) => {
        const node = localNodes.find((n) => n.id === d.source.id || n.id === d.source)
        return node?.color || "#999"
      })
      .attr("stroke-width", 2.5)
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", "url(#arrowhead)")

    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("markerWidth", 10)
      .attr("markerHeight", 10)
      .attr("refX", 25)
      .attr("refY", 3)
      .attr("orient", "auto")
      .append("polygon")
      .attr("points", "0 0, 10 3, 0 6")
      .attr("fill", "#999")

    const nodeGroups = g
      .selectAll("g.node")
      .data(localNodes as any)
      .join("g")
      .attr("class", "node")
      .attr("cursor", "pointer")
      .on("click", (event: any, d: any) => {
        event.stopPropagation()
        handleNodeClick(d)
      })
      .call(
        d3
          .drag()
          .on("start", (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on("drag", (event: any, d: any) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on("end", (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }) as any,
      )

    nodeGroups
      .append("circle")
      .attr("r", (d: any) => (d.messages_count > 0 ? 45 : 40))
      .attr("fill", (d: any) => d.color)
      .attr("fill-opacity", 0.2)
      .attr("stroke", (d: any) => d.color)
      .attr("stroke-width", 2.5)
      .style("filter", (d: any) => (selectedNode?.id === d.id ? "drop-shadow(0 0 10px rgba(0,0,0,0.3))" : "none"))

    nodeGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 13)
      .attr("font-weight", "bold")
      .attr("fill", (d: any) => d.color)
      .attr("pointer-events", "none")
      .text((d: any) => d.title.substring(0, 20))

    nodeGroups
      .append("circle")
      .attr("r", 18)
      .attr("cx", (d: any) => (d.messages_count > 0 ? 35 : -100))
      .attr("cy", -30)
      .attr("fill", (d: any) => d.color)
      .style("display", (d: any) => (d.messages_count > 0 ? "block" : "none"))

    nodeGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 12)
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .attr("cx", (d: any) => (d.messages_count > 0 ? 35 : -100))
      .attr("cy", -30)
      .attr("pointer-events", "none")
      .text((d: any) => (d.messages_count > 0 ? d.messages_count : ""))

    simulation.on("tick", () => {
      linkLines
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)

      nodeGroups.attr("transform", (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [localNodes, selectedNode?.id, containerSize])

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
            <span className="text-muted-foreground hidden sm:inline">/</span>
            <span className="text-muted-foreground hidden sm:inline">خريطة المحادثة</span>
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

          <div className="hidden md:flex items-center gap-1 border border-border rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                if (simulationRef.current) {
                  simulationRef.current.nodes([...localNodes])
                }
              }}
            >
              <Maximize className="h-3.5 w-3.5" />
            </Button>
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
        <div ref={containerRef} className="flex-1 overflow-hidden relative">
          <svg ref={svgRef} className="w-full h-full" />
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
