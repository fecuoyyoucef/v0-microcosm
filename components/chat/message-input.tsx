"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Send, Eye, GitBranch, X, Loader2, Reply, Camera, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { MessageLayer, GroupMember, ConversationNode, GroupSettings, Message } from "@/lib/types"
import { cn } from "@/lib/utils"

interface MessageInputProps {
  onSend: (
    content: string,
    layer: MessageLayer,
    nodeId?: string | null,
    visibleTo?: string[],
    attachmentUrl?: string,
    replyTo?: string | null,
  ) => Promise<void>
  members: GroupMember[]
  currentUserId: string
  nodes: ConversationNode[]
  selectedNodeId: string | null
  groupId: string
  isAdmin: boolean
  groupSettings?: GroupSettings
  replyingTo?: Message | null
  onCancelReply?: () => void
}

const layerOptions: { value: MessageLayer; label: string; icon: string }[] = [
  { value: "upper", label: "مهم", icon: "🟠" },
  { value: "standard", label: "عادي", icon: "⚪" },
  { value: "shadow", label: "ظل", icon: "🔘" },
]

export function MessageInput({
  onSend,
  members,
  currentUserId,
  nodes,
  selectedNodeId,
  groupId,
  isAdmin,
  groupSettings,
  replyingTo,
  onCancelReply,
}: MessageInputProps) {
  const [content, setContent] = useState("")
  const [selectedLayer, setSelectedLayer] = useState<MessageLayer>("standard")
  const [visibleTo, setVisibleTo] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false)
  const [isLayerOpen, setIsLayerOpen] = useState(false)
  const [messageNodeId, setMessageNodeId] = useState<string | null>(selectedNodeId)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isCheckingContent, setIsCheckingContent] = useState(false)
  const [isCorrectingText, setIsCorrectingText] = useState(false)
  const [showCorrectionHint, setShowCorrectionHint] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  const otherMembers = members.filter((m) => m.user_id !== currentUserId)
  const currentLayerOption = layerOptions.find((l) => l.value === selectedLayer)!

  const canPostInUpper = () => {
    if (!groupSettings) return true
    if (groupSettings.upper_layer_permission === "all") return true
    if (groupSettings.upper_layer_permission === "admin_only") return isAdmin
    return true
  }

  const availableLayers = layerOptions.filter((layer) => {
    if (layer.value === "upper" && !canPostInUpper()) return false
    return true
  })

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  useEffect(() => {
    if (content.length > 20) {
      const hasCommonErrors =
        content.includes("اللذي") || content.includes("التى") || content.match(/\b(في|من|على)\s+(ال[أ-ي]+)\b/)

      setShowCorrectionHint(hasCommonErrors)
    } else {
      setShowCorrectionHint(false)
    }
  }, [content])

  const handleCorrectArabic = async () => {
    if (!content.trim()) return

    setIsCorrectingText(true)
    try {
      const response = await fetch("/api/ai/correct-arabic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      })

      if (response.ok) {
        const { corrected } = await response.json()
        if (corrected && corrected !== content) {
          setContent(corrected)
        }
      }
    } catch (error) {
      console.error("Correction error:", error)
    } finally {
      setIsCorrectingText(false)
      setShowCorrectionHint(false)
    }
  }

  const handleSend = async () => {
    if ((!content.trim() && !selectedImage) || isSending) return

    // Check content for inappropriate material
    if (content.trim()) {
      setIsCheckingContent(true)
      try {
        const moderationResponse = await fetch("/api/ai/content-moderation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim() }),
        })

        if (moderationResponse.ok) {
          const { isAppropriate, reason } = await moderationResponse.json()
          if (!isAppropriate) {
            alert(`تنبيه: ${reason}\n\nيرجى مراجعة محتوى رسالتك.`)
            setIsCheckingContent(false)
            return
          }
        }
      } catch (error) {
        console.error("Content moderation error:", error)
      }
      setIsCheckingContent(false)
    }

    if (content.trim()) {
      try {
        const classifyResponse = await fetch("/api/ai/classify-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim() }),
        })

        if (classifyResponse.ok) {
          const { category, tasks } = await classifyResponse.json()

          console.log("[v0] Message classified as:", category)

          // Save extracted tasks to database
          if (tasks && tasks.length > 0) {
            console.log("[v0] Extracted tasks:", tasks)

            // We'll send the message first, then save tasks with the message_id
            // Store tasks temporarily to save after message is sent
            ;(window as any).__pendingTasks = { tasks, category }
          }
        }
      } catch (error) {
        console.error("Classification error:", error)
      }
    }

    setIsSending(true)
    try {
      let attachmentUrl: string | undefined

      if (selectedImage) {
        setIsUploadingImage(true)
        const fileExt = selectedImage.name.split(".").pop()
        const fileName = `${groupId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(fileName, selectedImage)

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from("message-attachments").getPublicUrl(fileName)
        attachmentUrl = publicUrl
        setIsUploadingImage(false)
      }

      const messageContent = content.trim() || (attachmentUrl ? "📷 صورة" : "")

      await onSend(
        messageContent,
        selectedLayer,
        messageNodeId,
        selectedLayer === "shadow" && visibleTo.length > 0 ? visibleTo : undefined,
        attachmentUrl,
        replyingTo?.id || null,
      )

      const pendingTasks = (window as any).__pendingTasks
      if (pendingTasks?.tasks && pendingTasks.tasks.length > 0) {
        // Get the last message ID from the group
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("id")
          .eq("group_id", groupId)
          .eq("sender_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (lastMessage) {
          for (const task of pendingTasks.tasks) {
            await supabase.from("extracted_tasks").insert({
              message_id: lastMessage.id,
              group_id: groupId,
              task_content: task,
              created_by: currentUserId,
              status: "pending",
            })
          }
        }

        delete (window as any).__pendingTasks
      }

      setContent("")
      setVisibleTo([])
      clearImage()
    } finally {
      setIsSending(false)
      setIsUploadingImage(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.shiftKey || e.ctrlKey) {
        e.preventDefault()
        handleSend()
      }
    }
  }

  const toggleVisibleTo = (userId: string) => {
    setVisibleTo((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  return (
    <div className="shrink-0 border-t border-border/50 bg-background w-full max-w-full overflow-hidden">
      {/* Reply preview */}
      {replyingTo && (
        <div className="px-3 py-1.5 bg-muted/50 border-b border-border/50 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-0.5 h-6 bg-primary rounded-full shrink-0" />
            <Reply className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-primary truncate">
                {replyingTo.sender?.display_name || "مستخدم"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{replyingTo.content}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-full" onClick={onCancelReply}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {showCorrectionHint && !isCorrectingText && (
        <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>هل تريد تصحيح النص بالذكاء الاصطناعي؟</span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] text-amber-700 hover:text-amber-900 dark:text-amber-300"
            onClick={handleCorrectArabic}
          >
            تصحيح
          </Button>
        </div>
      )}

      <div className="p-2 w-full max-w-full">
        {/* Image preview */}
        {imagePreview && (
          <div className="mb-2 relative inline-block animate-in zoom-in-95 duration-200">
            <img src={imagePreview || "/placeholder.svg"} alt="Preview" className="max-h-20 rounded-xl shadow-md" />
            <button
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Input row - redesigned to prevent overflow */}
        <div className="flex items-center gap-2 w-full max-w-full">
          {/* Camera button */}
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors bg-transparent"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
          >
            {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

          {/* Text input container */}
          <div className="flex-1 min-w-0 flex items-center gap-1 border border-border/80 bg-muted/30 rounded-full px-3 py-1">
            {/* Layer picker */}
            <Popover open={isLayerOpen} onOpenChange={setIsLayerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-full p-0">
                  <span className="text-sm">{currentLayerOption.icon}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-28 p-1" align="start">
                {availableLayers.map((layer) => (
                  <Button
                    key={layer.value}
                    variant={selectedLayer === layer.value ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setSelectedLayer(layer.value)
                      setIsLayerOpen(false)
                    }}
                    className="w-full justify-start gap-2 h-8 text-xs"
                  >
                    <span>{layer.icon}</span>
                    <span>{layer.label}</span>
                  </Button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Text input */}
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className="min-h-[32px] max-h-20 resize-none border-0 bg-transparent px-2 text-sm py-1.5 focus-visible:ring-0 flex-1 min-w-0"
              rows={1}
            />

            {/* Action buttons */}
            <div className="flex items-center gap-0.5 shrink-0">
              {/* Node selector */}
              {nodes.length > 0 && (
                <Select
                  value={messageNodeId || "none"}
                  onValueChange={(v) => setMessageNodeId(v === "none" ? null : v)}
                >
                  <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent rounded-full">
                    <GitBranch className={cn("w-4 h-4", messageNodeId ? "text-primary" : "text-muted-foreground")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون عقدة</SelectItem>
                    {nodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: node.color }} />
                          {node.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Visibility for Shadow Layer */}
              {selectedLayer === "shadow" && (
                <Popover open={isVisibilityOpen} onOpenChange={setIsVisibilityOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full p-0">
                      <Eye className={cn("w-4 h-4", visibleTo.length > 0 ? "text-primary" : "text-muted-foreground")} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" align="end">
                    <div className="space-y-2">
                      <p className="text-xs font-medium">من يمكنه رؤية هذه الرسالة؟</p>
                      <ScrollArea className="h-32">
                        <div className="space-y-1.5">
                          {otherMembers.map((member) => (
                            <div key={member.id} className="flex items-center gap-2">
                              <Checkbox
                                id={member.id}
                                checked={visibleTo.includes(member.user_id)}
                                onCheckedChange={() => toggleVisibleTo(member.user_id)}
                              />
                              <Label htmlFor={member.id} className="text-xs cursor-pointer">
                                {member.profile?.display_name || "مستخدم"}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Send button */}
              <Button
                onClick={handleSend}
                disabled={(!content.trim() && !selectedImage) || isSending || isCheckingContent}
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full p-0 text-primary hover:text-primary"
              >
                {isSending || isCheckingContent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Hint text */}
        <p className="text-[9px] text-muted-foreground/60 mt-1 text-center">Shift + Enter للإرسال</p>
      </div>
    </div>
  )
}
