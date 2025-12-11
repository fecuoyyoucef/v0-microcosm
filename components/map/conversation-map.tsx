"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
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
import { Plus, ZoomIn, ZoomOut, Maximize, MessageSquare, ChevronLeft, Hash, Loader2, Search, X } from "lucide-react"
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
  const [nodes, setNodes] = useState<ConversationNode[]>(initialNodes)
  const [selectedNode, setSelectedNode] = useState<ConversationNode | null>(null)
  const [nodeMessages, setNodeMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newNodeTitle, setNewNodeTitle] = useState("")
  const [newNodeDescription, setNewNodeDescription] = useState("")
  const [newNodeParent, setNewNodeParent] = useState<string | null>(null)
  const [newNodeColor, setNewNodeColor] = useState(NODE_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

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
            setNodes(data)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, supabase])

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

  const createNode = async () => {
    if (!newNodeTitle.trim()) return

    setIsCreating(true)
    try {
      let posX = 100 + Math.random() * 200
      let posY = 100 + Math.random() * 200

      if (newNodeParent) {
        const parentNode = nodes.find((n) => n.id === newNodeParent)
        if (parentNode) {
          posX = parentNode.position_x + 250
          posY = parentNode.position_y + Math.random() * 100 - 50
        }
      }

      const { error } = await supabase.from("conversation_nodes").insert({
        group_id: groupId,
        title: newNodeTitle.trim(),
        description: newNodeDescription.trim() || null,
        parent_id: newNodeParent,
        color: newNodeColor,
        position_x: posX,
        position_y: posY,
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains("map-canvas")) {
      setIsPanning(true)
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.3), 2))
  }

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const filteredNodes = searchQuery
    ? nodes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : nodes

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
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
          {/* Search - hidden on mobile */}
          <div className="relative hidden md:block">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث في العقد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 pr-9 h-8 bg-background"
            />
          </div>

          {/* Zoom Controls */}
          <div className="hidden md:flex items-center gap-1 border border-border rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.3))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetView}>
              <Maximize className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Create Node */}
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
                    {nodes.map((node) => (
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Map Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing map-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div
            className="w-full h-full relative map-canvas"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            {/* SVG for connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
              {nodes.map((node) => {
                if (!node.parent_id) return null
                const parent = nodes.find((n) => n.id === node.parent_id)
                if (!parent) return null

                return (
                  <line
                    key={`line-${node.id}`}
                    x1={parent.position_x + 80}
                    y1={parent.position_y + 30}
                    x2={node.position_x}
                    y2={node.position_y + 30}
                    stroke={node.color}
                    strokeWidth={2}
                    strokeOpacity={0.4}
                  />
                )
              })}
            </svg>

            {/* Nodes */}
            {filteredNodes.map((node) => (
              <MapNode
                key={node.id}
                node={node}
                isSelected={selectedNode?.id === node.id}
                onClick={() => handleNodeClick(node)}
              />
            ))}

            {/* Empty State */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-4">
                  <p className="text-muted-foreground mb-4">لا توجد عقد بعد. أنشئ عقدتك الأولى!</p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 ml-1" />
                    إنشاء عقدة
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Node Details Panel */}
        {selectedNode && (
          <div className="w-72 md:w-80 border-r border-border bg-card flex flex-col shrink-0">
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
                            <AvatarImage src={message.sender?.avatar_url || undefined} />
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

function MapNode({
  node,
  isSelected,
  onClick,
}: {
  node: ConversationNode
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <div
      className={cn(
        "absolute px-4 py-3 rounded-xl bg-card border-2 cursor-pointer transition-all hover:shadow-lg min-w-[140px] max-w-[180px]",
        isSelected ? "shadow-lg scale-105" : "hover:scale-102",
      )}
      style={{
        left: node.position_x,
        top: node.position_y,
        borderColor: node.color,
      }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
        <h4 className="font-medium text-sm truncate">{node.title}</h4>
      </div>
      {node.description && <p className="text-xs text-muted-foreground line-clamp-2">{node.description}</p>}
      {node.messages_count !== undefined && node.messages_count > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <MessageSquare className="w-3 h-3" />
          <span>{node.messages_count}</span>
        </div>
      )}
    </div>
  )
}
