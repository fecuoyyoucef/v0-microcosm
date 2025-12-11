"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Send, Eye, GitBranch, ImageIcon, X, Loader2, Reply } from "lucide-react"
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

  const handleSend = async () => {
    if ((!content.trim() && !selectedImage) || isSending) return

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

      await onSend(
        content.trim() || (attachmentUrl ? "📷 صورة" : ""),
        selectedLayer,
        messageNodeId,
        selectedLayer === "shadow" && visibleTo.length > 0 ? visibleTo : undefined,
        attachmentUrl,
        replyingTo?.id || null,
      )
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
      // Normal Enter adds new line (default behavior)
    }
  }

  const toggleVisibleTo = (userId: string) => {
    setVisibleTo((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  return (
    <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm">
      {/* Reply preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1 h-8 bg-primary rounded-full" />
            <Reply className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary">{replyingTo.sender?.display_name || "مستخدم"}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-[400px]">
                {replyingTo.content}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-full" onClick={onCancelReply}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="p-2 md:p-3">
        <div className="max-w-3xl mx-auto">
          {/* Image preview */}
          {imagePreview && (
            <div className="mb-2 relative inline-block animate-in zoom-in-95 duration-200">
              <img src={imagePreview || "/placeholder.svg"} alt="Preview" className="max-h-24 rounded-xl shadow-md" />
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* Layer Picker */}
            <Popover open={isLayerOpen} onOpenChange={setIsLayerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-xl border transition-all",
                    selectedLayer === "upper" && "border-orange-300 bg-orange-50 dark:bg-orange-950/30",
                    selectedLayer === "shadow" && "border-gray-300 bg-gray-100 dark:bg-gray-900/50",
                    selectedLayer === "standard" && "border-border bg-background",
                  )}
                >
                  <span className="text-lg">{currentLayerOption.icon}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-1.5" align="start">
                <div className="space-y-0.5">
                  {availableLayers.map((layer) => (
                    <Button
                      key={layer.value}
                      variant={selectedLayer === layer.value ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setSelectedLayer(layer.value)
                        setIsLayerOpen(false)
                      }}
                      className="w-full justify-start gap-2 h-9 rounded-lg"
                    >
                      <span>{layer.icon}</span>
                      <span>{layer.label}</span>
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Text Input Container */}
            <div className="flex-1 relative min-w-0 bg-muted/50 rounded-2xl border border-border focus-within:border-primary/50 focus-within:bg-background transition-all">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب رسالتك..."
                className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent rounded-2xl pr-3 pl-24 text-sm py-2.5 focus-visible:ring-0 focus-visible:ring-offset-0"
                rows={1}
              />

              {/* Inline controls */}
              <div className="absolute left-2 bottom-1.5 flex items-center gap-0.5">
                {/* Image button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-background"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className={cn("w-4 h-4", selectedImage ? "text-primary" : "text-muted-foreground")} />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {/* Node selector */}
                {nodes.length > 0 && (
                  <Select
                    value={messageNodeId || "none"}
                    onValueChange={(v) => setMessageNodeId(v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent hover:bg-background rounded-full">
                      <GitBranch className={cn("w-4 h-4", messageNodeId ? "text-primary" : "text-muted-foreground")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون عقدة</SelectItem>
                      {nodes.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: node.color }} />
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
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-background">
                        <Eye
                          className={cn("w-4 h-4", visibleTo.length > 0 ? "text-primary" : "text-muted-foreground")}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="end">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">من يمكنه رؤية هذه الرسالة؟</p>
                        <ScrollArea className="h-40 mt-3">
                          <div className="space-y-2">
                            {otherMembers.map((member) => (
                              <div key={member.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={member.id}
                                  checked={visibleTo.includes(member.user_id)}
                                  onCheckedChange={() => toggleVisibleTo(member.user_id)}
                                />
                                <Label htmlFor={member.id} className="text-sm cursor-pointer">
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
              </div>
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={(!content.trim() && !selectedImage) || isSending}
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl shadow-md"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          {/* Hint text */}
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Shift + Enter للإرسال</p>
        </div>
      </div>
    </div>
  )
}
