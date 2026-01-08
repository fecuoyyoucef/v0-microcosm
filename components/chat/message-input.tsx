"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import {
  PaperAirplaneIcon as SendIcon,
  EyeIcon,
  XMarkIcon as XIcon,
  ArrowPathIcon as Loader2Icon,
  ArrowUturnLeftIcon as ReplyIcon,
  PlusIcon,
  SparklesIcon,
  AtSymbolIcon as AtSignIcon,
  PencilSquareIcon as Edit2Icon,
  CodeBracketIcon as GitBranchIcon,
  DocumentTextIcon as FileTextIcon,
} from "@heroicons/react/24/outline"
import { createClient } from "@/lib/supabase/client"
import type { MessageLayer, GroupMember, ConversationNode, GroupSettings, Message } from "@/lib/types"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { toast } from "react-toastify"
import { parseMentions } from "@/lib/utils"
import { useBottomNav } from "@/lib/contexts/bottom-nav-context"

interface MessageInputProps {
  onSend: (
    content: string,
    layer: MessageLayer,
    nodeId?: string | null,
    visibleTo?: string[],
    attachmentUrl?: string,
    replyTo?: string | null,
    replyPreview?: { id: string; content: string; user_name: string } | null,
    attachments?: Array<{ url: string; type: string; name: string; size: number }>,
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<{ file: File; preview: string; type: string }[]>([])
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
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
  const router = useRouter()
  const { bottomNavHeight } = useBottomNav()

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newFiles = [...selectedFiles, ...files].slice(0, 10) // Max 10 files
    setSelectedFiles(newFiles)

    // Generate previews
    const newPreviews: { file: File; preview: string; type: string }[] = []

    newFiles.forEach((file) => {
      const fileType = file.type.startsWith("image/") ? "image" : "document"

      if (fileType === "image") {
        const reader = new FileReader()
        reader.onload = (e) => {
          newPreviews.push({
            file,
            preview: e.target?.result as string,
            type: "image",
          })
          if (newPreviews.length === newFiles.length) {
            setFilePreviews(newPreviews)
          }
        }
        reader.readAsDataURL(file)
      } else {
        newPreviews.push({
          file,
          preview: "",
          type: "document",
        })
        if (newPreviews.length === newFiles.length) {
          setFilePreviews(newPreviews)
        }
      }
    })
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setFilePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const clearFiles = () => {
    setSelectedFiles([])
    setFilePreviews([])
    if (fileInputRef.current) fileInputRef.current.value = ""
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
    if ((!content.trim() && selectedFiles.length === 0) || isSending) return

    setIsSending(true)
    const attachments: Array<{ url: string; type: string; name: string; size: number }> = []

    if (selectedFiles.length > 0) {
      setIsUploadingFiles(true)
      try {
        for (const file of selectedFiles) {
          const fileExt = file.name.split(".").pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `${groupId}/${fileName}`

          const { data, error } = await supabase.storage.from("message-attachments").upload(filePath, file)

          if (error) throw error

          const { data: urlData } = supabase.storage.from("message-attachments").getPublicUrl(filePath)

          const fileType = file.type.startsWith("image/") ? "image" : "document"

          attachments.push({
            url: urlData.publicUrl,
            type: fileType,
            name: file.name,
            size: file.size,
          })
        }
      } catch (error) {
        console.error("Error uploading files:", error)
        toast.error("فشل رفع الملفات")
        setIsUploadingFiles(false)
        setIsSending(false)
        return
      }
      setIsUploadingFiles(false)
    }

    const finalContent = content.trim() || (attachments.length > 0 ? "📁 مرفقات" : "")

    if (editingMessage) {
      // Update message
      const { error } = await supabase
        .from("messages")
        .update({
          content: finalContent,
          updated_at: new Date().toISOString(),
          ...(attachments.length > 0 && { attachments }),
        })
        .eq("id", editingMessage.id)

      if (!error) {
        setContent("")
        clearFiles()
        onCancelEdit?.()
        toast.success("تم تعديل الرسالة")
      }
    } else {
      let replyPreview = null
      if (replyingTo) {
        replyPreview = {
          id: replyingTo.id,
          content: replyingTo.content,
          user_name: replyingTo.sender?.display_name || "مستخدم",
        }
      }

      await onSend(
        finalContent,
        selectedLayer,
        messageNodeId,
        visibleTo,
        undefined,
        replyingTo?.id || null,
        replyPreview,
        attachments.length > 0 ? attachments : undefined,
      )

      setContent("")
      clearFiles()
      onCancelReply?.()
      setMentionedUsers([])
    }

    setIsSending(false)
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
    <div
      className={cn(
        "relative bg-background/95 backdrop-blur-lg border-t border-border p-4 pb-safe transition-all duration-300 lg:static",
      )}
    >
      {editingMessage && (
        <div className="px-3 py-1.5 bg-muted/50 border-b border-border/50 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-0.5 h-6 bg-primary rounded-full shrink-0" />
            <Edit2Icon className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-primary truncate">تعديل الرسالة</p>
              <p className="text-[11px] text-muted-foreground truncate">{editingMessage.content}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-full" onClick={onCancelEdit}>
            <XIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Reply preview */}
      {replyingTo && !editingMessage && (
        <div className="px-3 py-1.5 bg-muted/50 border-b border-border/50 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-0.5 h-6 bg-primary rounded-full shrink-0" />
            <ReplyIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-primary truncate">
                {replyingTo.sender?.display_name || "مستخدم"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{replyingTo.content}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-full" onClick={onCancelReply}>
            <XIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {showCorrectionHint && !isCorrectingText && (
        <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
            <SparklesIcon className="w-3 h-3" />
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
          <AtSignIcon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
          <p className="text-[11px] text-violet-700 dark:text-violet-300 flex-1">
            ذكرت {mentionedUsers.length} {mentionedUsers.length === 1 ? "شخص" : "أشخاص"}
          </p>
        </div>
      )}

      <div className="p-2 w-full max-w-full box-border">
        {/* File previews */}
        {filePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 border-t border-border">
            {filePreviews.map((item, index) => (
              <div key={index} className="relative group">
                {item.type === "image" ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <Image src={item.preview || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="relative w-20 h-20 rounded-lg border border-border flex flex-col items-center justify-center bg-muted p-2">
                    <FileTextIcon className="w-6 h-6 mb-1" />
                    <span className="text-xs truncate w-full text-center">{item.file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
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
            disabled={isUploadingFiles}
            title="إرفاق ملفات"
          >
            {isUploadingFiles ? <Loader2Icon className="w-5 h-5 animate-spin" /> : <PlusIcon className="w-5 h-5" />}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.docx,.md"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

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
              className="flex-1 min-w-0 min-h-[32px] max-h-20 resize-none border-0 bg-transparent px-2 text-sm py-1.5 focus-visible:ring-0"
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
                    <GitBranchIcon
                      className={cn("w-4 h-4", messageNodeId ? "text-primary" : "text-muted-foreground")}
                    />
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
                      <EyeIcon
                        className={cn("w-4 h-4", visibleTo.length > 0 ? "text-primary" : "text-muted-foreground")}
                      />
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
                disabled={(!content.trim() && selectedFiles.length === 0) || isSending || isCorrectingText}
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full p-0 text-primary hover:text-primary"
              >
                {isSending || isCorrectingText ? (
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                ) : (
                  <SendIcon className="w-4 h-4" />
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
