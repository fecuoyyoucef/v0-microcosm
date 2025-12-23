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
import { Send, Eye, GitBranch, X, Loader2, Reply, Camera, Sparkles, AtSign, Edit2 } from "lucide-react"
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
  onTyping?: () => void
  editingMessage?: Message | null
  onCancelEdit?: () => void
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
  onTyping,
  editingMessage,
  onCancelEdit,
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
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([])
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState("")
  const [mentionSuggestions, setMentionSuggestions] = useState<GroupMember[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  const otherMembers = members.filter((m) => m.user_id !== currentUserId)
  const currentLayerOption = layerOptions.find((l) => l.value === selectedLayer)!

  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content || "")
    }
  }, [editingMessage])

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

  const parseMentions = (text: string): string[] => {
    const mentionPattern = /@(\w+)/g
    const mentions = []
    let match

    while ((match = mentionPattern.exec(text)) !== null) {
      const username = match[1]
      const member = members.find(
        (m) =>
          m.profile?.username?.toLowerCase() === username.toLowerCase() ||
          m.profile?.display_name?.replace(/\s+/g, "").toLowerCase() === username.toLowerCase(),
      )
      if (member && !mentions.includes(member.user_id)) {
        mentions.push(member.user_id)
      }
    }
    return mentions
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)

    const cursorPosition = e.target.selectionStart
    const textBeforeCursor = newContent.slice(0, cursorPosition)
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@")

    if (lastAtSymbol !== -1 && lastAtSymbol === cursorPosition - 1) {
      // User just typed @
      setShowMentionSuggestions(true)
      setMentionSearch("")
      setMentionSuggestions(otherMembers)
      setSelectedSuggestionIndex(0)
    } else if (lastAtSymbol !== -1) {
      // User is typing after @
      const searchText = textBeforeCursor.slice(lastAtSymbol + 1)
      if (/^[a-zA-Z0-9_]*$/.test(searchText) && searchText.length < 20) {
        setShowMentionSuggestions(true)
        setMentionSearch(searchText)

        // Filter members by username or display name
        const filtered = otherMembers.filter((m) => {
          const username = m.profile?.username?.toLowerCase() || ""
          const displayName = m.profile?.display_name?.toLowerCase() || ""
          const search = searchText.toLowerCase()
          return username.includes(search) || displayName.includes(search)
        })

        setMentionSuggestions(filtered)
        setSelectedSuggestionIndex(0)
      } else {
        setShowMentionSuggestions(false)
      }
    } else {
      setShowMentionSuggestions(false)
    }

    const mentions = parseMentions(newContent)
    setMentionedUsers(mentions)

    if (onTyping) {
      onTyping()

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null
      }, 2000)
    }
  }

  const selectMention = (member: GroupMember) => {
    const username = member.profile?.username || member.profile?.display_name?.replace(/\s+/g, "") || "user"
    const cursorPosition = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = content.slice(0, cursorPosition)
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@")

    if (lastAtSymbol !== -1) {
      const newContent = content.slice(0, lastAtSymbol) + `@${username} ` + content.slice(cursorPosition)

      setContent(newContent)
      setShowMentionSuggestions(false)

      // Focus back on textarea
      setTimeout(() => {
        textareaRef.current?.focus()
        const newCursorPos = lastAtSymbol + username.length + 2
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionSuggestions && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedSuggestionIndex((prev) => (prev < mentionSuggestions.length - 1 ? prev + 1 : prev))
        return
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0))
        return
      } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault()
        selectMention(mentionSuggestions[selectedSuggestionIndex])
        return
      } else if (e.key === "Escape") {
        setShowMentionSuggestions(false)
        return
      }
    }

    if (e.key === "Enter") {
      if (e.shiftKey || e.ctrlKey) {
        e.preventDefault()
        handleSend()
      }
    }
  }

  const handleSend = async () => {
    if ((!content.trim() && !selectedImage) || isSending) return

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
          // Only block if it's really inappropriate
          if (!isAppropriate && reason.includes("خطير")) {
            alert(`تنبيه: ${reason}\n\nيرجى مراجعة محتوى رسالتك.`)
            setIsCheckingContent(false)
            return
          }
        }
      } catch (error) {
        console.error("Content moderation error:", error)
        // Continue sending even if moderation fails
      }
      setIsCheckingContent(false)
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

      if (editingMessage) {
        await fetch(`/api/messages/${editingMessage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: messageContent }),
        })
        onCancelEdit?.()
      } else {
        await onSend(
          messageContent,
          selectedLayer,
          messageNodeId,
          selectedLayer === "shadow" && visibleTo.length > 0 ? visibleTo : undefined,
          attachmentUrl,
          replyingTo?.id || null,
        )

        if (mentionedUsers.length > 0) {
          try {
            await fetch("/api/messages/send-with-mentions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                groupId,
                content: messageContent,
                mentionedUsers,
              }),
            })
          } catch (error) {
            console.error("[v0] Failed to send mention notifications:", error)
          }
        }

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
      }

      setContent("")
      setVisibleTo([])
      setMentionedUsers([])
      clearImage()
    } finally {
      setIsSending(false)
      setIsUploadingImage(false)
    }
  }

  const toggleVisibleTo = (userId: string) => {
    setVisibleTo((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const hasMentions = mentionedUsers.length > 0

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

  return (
    <div className="shrink-0 border-t border-border/50 bg-background w-full max-w-full overflow-hidden relative">
      {editingMessage && (
        <div className="px-3 py-1.5 bg-muted/50 border-b border-border/50 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-0.5 h-6 bg-primary rounded-full shrink-0" />
            <Edit2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-primary truncate">تعديل الرسالة</p>
              <p className="text-[11px] text-muted-foreground truncate">{editingMessage.content}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-full" onClick={onCancelEdit}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Reply preview */}
      {replyingTo && !editingMessage && (
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

      {hasMentions && (
        <div className="px-3 py-1 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
          <AtSign className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
          <p className="text-[11px] text-violet-700 dark:text-violet-300 flex-1">
            ذكرت {mentionedUsers.length} {mentionedUsers.length === 1 ? "شخص" : "أشخاص"}
          </p>
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

        {showMentionSuggestions && mentionSuggestions.length > 0 && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in slide-in-from-bottom-2 duration-200 max-h-48 overflow-y-auto z-50">
            {mentionSuggestions.map((member, index) => (
              <button
                key={member.id}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-2 hover:bg-muted transition-colors text-left",
                  index === selectedSuggestionIndex && "bg-muted",
                )}
                onClick={() => selectMention(member)}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {member.profile?.avatar_url ? (
                    <img
                      src={member.profile.avatar_url || "/placeholder.svg"}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-primary">
                      {(member.profile?.display_name || "U")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.profile?.display_name || "مستخدم"}</p>
                  {member.profile?.username && (
                    <p className="text-xs text-muted-foreground truncate">@{member.profile.username}</p>
                  )}
                </div>
              </button>
            ))}
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
          <div className="flex-1 min-w-0 flex items-center gap-1 border border-border/80 bg-muted/30 rounded-full px-3 py-1 relative">
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
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالة... (@للإشارة)"
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
        <p className="text-[9px] text-muted-foreground/60 mt-1 text-center">
          Shift + Enter للإرسال • اكتب @ للإشارة لشخص
        </p>
      </div>
    </div>
  )
}
