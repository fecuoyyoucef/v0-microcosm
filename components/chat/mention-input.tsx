"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { GroupMember } from "@/lib/types"
import { cn } from "@/lib/utils"

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  members: GroupMember[]
  className?: string
  placeholder?: string
  onMentionSelect?: (userId: string) => void
}

export function MentionInput({ value, onChange, members, className, placeholder, onMentionSelect }: MentionInputProps) {
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const filteredMembers = members.filter((member) => {
    const displayName = member.profile?.display_name?.toLowerCase() || ""
    const username = member.profile?.username?.toLowerCase() || ""
    const query = mentionQuery.toLowerCase()
    return displayName.includes(query) || username.includes(query)
  })

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const handleInput = () => {
      const cursorPosition = textarea.selectionStart
      const textBeforeCursor = value.substring(0, cursorPosition)
      const lastAtIndex = textBeforeCursor.lastIndexOf("@")

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)

        // Check if there's a space after @, if yes, don't show mentions
        if (!textAfterAt.includes(" ")) {
          setMentionQuery(textAfterAt)
          setShowMentions(true)
          setSelectedIndex(0)

          // Calculate position for mention dropdown
          const lines = textBeforeCursor.split("\n")
          const currentLine = lines[lines.length - 1]
          const lineHeight = 20
          const top = (lines.length - 1) * lineHeight

          setMentionPosition({ top, left: 0 })
        } else {
          setShowMentions(false)
        }
      } else {
        setShowMentions(false)
      }
    }

    textarea.addEventListener("input", handleInput)
    textarea.addEventListener("click", handleInput)
    textarea.addEventListener("keyup", handleInput)

    return () => {
      textarea.removeEventListener("input", handleInput)
      textarea.removeEventListener("click", handleInput)
      textarea.removeEventListener("keyup", handleInput)
    }
  }, [value])

  const insertMention = (member: GroupMember) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPosition = textarea.selectionStart
    const textBeforeCursor = value.substring(0, cursorPosition)
    const textAfterCursor = value.substring(cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    const username = member.profile?.username || member.profile?.display_name?.replace(/\s+/g, "") || "user"
    const newValue = textBeforeCursor.substring(0, lastAtIndex) + `@${username} ` + textAfterCursor

    onChange(newValue)
    setShowMentions(false)

    // Set cursor position after mention
    setTimeout(() => {
      const newCursorPos = lastAtIndex + username.length + 2
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)

    if (onMentionSelect) {
      onMentionSelect(member.user_id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showMentions || filteredMembers.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % filteredMembers.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length)
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (showMentions) {
        e.preventDefault()
        insertMention(filteredMembers[selectedIndex])
      }
    } else if (e.key === "Escape") {
      setShowMentions(false)
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("w-full resize-none", className)}
        rows={1}
      />

      {showMentions && filteredMembers.length > 0 && (
        <div
          className="absolute z-50 w-64 bg-popover border border-border rounded-lg shadow-lg"
          style={{
            bottom: "100%",
            marginBottom: "4px",
            left: mentionPosition.left,
          }}
        >
          <ScrollArea className="max-h-48">
            <div className="p-1">
              {filteredMembers.map((member, index) => (
                <button
                  key={member.id}
                  onClick={() => insertMention(member)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                  )}
                >
                  <Avatar className="w-6 h-6">
                    {member.profile?.avatar_url && (
                      <AvatarImage src={member.profile.avatar_url || "/placeholder.svg"} />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {member.profile?.display_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium leading-none">{member.profile?.display_name || "Unknown"}</p>
                    {member.profile?.username && (
                      <p className="text-xs text-muted-foreground">@{member.profile.username}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
