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
import { Plus, ChevronLeft, Hash, Loader2, Search, X, ChevronDown, ChevronRight } from "lucide-react"
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

interface TreeNode extends d3.HierarchyNode<ConversationNode> {
  _children?: TreeNode[]
  collapsed?: boolean
}

export function ConversationMap({ groupId, group, nodes: initialNodes, currentUserId }: ConversationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
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
  const [isHorizontal, setIsHorizontal] = useState(true)
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

    const nodeMap = new Map(nodes.map((n) => [n.id, { ...n, children: [] as any[] }]))

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
      children: rootNodes.map((r) => nodeMap.get(r.id)).filter(Boolean),
    }
  }

  const toggleNode = (d: TreeNode) => {
    if (d.children) {
      d._children = d.children
      d.children = undefined as any
      d.collapsed = true
    } else if (d._children) {
      d.children = d._children
      d._children = undefined
      d.collapsed = false
    }
  }

  useEffect(() => {
    if (!svgRef.current || localNodes.length === 0) return

    const width = containerSize.width
    const height = containerSize.height
    const margin = { top: 40, right: 120, bottom: 40, left: 120 }

    d3.select(svgRef.current).selectAll("*").remove()

    const hierarchyData = buildHierarchy(localNodes)
    if (!hierarchyData) return

    const root = d3.hierarchy(hierarchyData as any) as TreeNode

    const treeLayout = d3.tree<ConversationNode>().nodeSize(isHorizontal ? [80, 250] : [250, 80])

    treeLayout(root as any)

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `${-width / 2} ${-height / 2} ${width} ${height}`)

    const g = svg.append("g").attr("transform", `translate(${margin.left}, ${height / 2})`)

    const zoom = d3
      .zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })

    svg.call(zoom as any)

    const update = (source: TreeNode) => {
      const nodes = root.descendants()
      const links = root.links()

      const linkPath = (d: any) => {
        if (isHorizontal) {
          return `M${d.source.y},${d.source.x}
                  C${(d.source.y + d.target.y) / 2},${d.source.x}
                   ${(d.source.y + d.target.y) / 2},${d.target.x}
                   ${d.target.y},${d.target.x}`
        } else {
          return `M${d.source.x},${d.source.y}
                  C${d.source.x},${(d.source.y + d.target.y) / 2}
                   ${d.target.x},${(d.source.y + d.target.y) / 2}
                   ${d.target.x},${d.target.y}`
        }
      }

      const link = g
        .selectAll(".link")
        .data(links, (d: any) => d.target.data.id)
        .join("path")
        .attr("class", "link")
        .attr("d", linkPath as any)
        .attr("fill", "none")
        .attr("stroke", (d: any) => d.target.data.color || "#64748b")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.4)

      const node = g
        .selectAll(".node")
        .data(nodes, (d: any) => d.data.id)
        .join("g")
        .attr("class", "node")
        .attr("transform", (d: any) => (isHorizontal ? `translate(${d.y},${d.x})` : `translate(${d.x},${d.y})`))
        .attr("cursor", "pointer")
        .on("click", (event: any, d: any) => {
          event.stopPropagation()
          if (d.data.id !== "virtual-root") {
            handleNodeClick(d.data)
          }
          if (d.children || d._children) {
            toggleNode(d)
            update(d)
          }
        })

      node
        .append("rect")
        .attr("width", 180)
        .attr("height", 60)
        .attr("x", -90)
        .attr("y", -30)
        .attr("rx", 8)
        .attr("fill", (d: any) => d.data.color || "#3b82f6")
        .attr("fill-opacity", 0.15)
        .attr("stroke", (d: any) => d.data.color || "#3b82f6")
        .attr("stroke-width", 2)
        .style("filter", (d: any) => (selectedNode?.id === d.data.id ? "drop-shadow(0 0 8px rgba(0,0,0,0.3))" : "none"))

      node
        .append("text")
        .attr("dy", -5)
        .attr("text-anchor", "middle")
        .attr("font-size", 13)
        .attr("font-weight", "600")
        .attr("fill", (d: any) => d.data.color || "#3b82f6")
        .text((d: any) => {
          const title = d.data.title || ""
          return title.length > 20 ? title.substring(0, 18) + "..." : title
        })

      node
        .filter((d: any) => d.data.messages_count > 0)
        .append("circle")
        .attr("cx", 70)
        .attr("cy", -20)
        .attr("r", 12)
        .attr("fill", (d: any) => d.data.color || "#3b82f6")

      node
        .filter((d: any) => d.data.messages_count > 0)
        .append("text")
        .attr("x", 70)
        .attr("y", -20)
        .attr("dy", 4)
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .text((d: any) => d.data.messages_count)

      node
        .filter((d: any) => d.children || d._children)
        .append("circle")
        .attr("cx", isHorizontal ? 90 : 0)
        .attr("cy", isHorizontal ? 0 : 30)
        .attr("r", 10)
        .attr("fill", (d: any) => d.data.color || "#3b82f6")
        .attr("stroke", "white")
        .attr("stroke-width", 2)

      node
        .filter((d: any) => d.children || d._children)
        .append("text")
        .attr("x", isHorizontal ? 90 : 0)
        .attr("y", isHorizontal ? 0 : 30)
        .attr("dy", 4)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("fill", "white")
        .attr("font-weight", "bold")
        .text((d: any) => (d.collapsed ? "+" : "-"))
    }

    update(root)

    return () => {
      svg.selectAll("*").remove()
    }
  }, [localNodes, selectedNode?.id, containerSize, isHorizontal, group.name])

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

          <Button
            variant="outline"
            size="sm"
            className="h-8 hidden md:flex bg-transparent"
            onClick={() => setIsHorizontal(!isHorizontal)}
          >
            {isHorizontal ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            <span className="text-xs">{isHorizontal ? "أفقي" : "عمودي"}</span>
          </Button>

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
          className="flex-1 overflow-hidden relative bg-gradient-to-br from-background to-muted/20"
        >
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
