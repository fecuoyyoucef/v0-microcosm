"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, X, Bot, User } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface SupportChatProps {
  onClose?: () => void
}

export function SupportChat({ onClose }: SupportChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "مرحباً! كيف يمكنني مساعدتك اليوم؟",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CHATBASE_HOST || "https://www.chatbase.co"}/api/v1/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatbotId: process.env.NEXT_PUBLIC_CHATBOT_ID,
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: false,
          }),
        },
      )

      if (response.ok) {
        const data = await response.json()
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: data.text || "عذراً، حدث خطأ. حاول مرة أخرى.",
          },
        ])
      } else {
        throw new Error("Failed to get response")
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "عذراً، حدث خطأ في الاتصال. حاول مرة أخرى.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        maxHeight: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0a0a0a",
        overflow: "hidden",
      }}
    >
      {/* Header - Fixed */}
      <div
        style={{
          flexShrink: 0,
          padding: "16px",
          borderBottom: "1px solid #262626",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0a",
        }}
      >
        <div style={{ textAlign: "center", flex: 1 }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#fff", margin: 0 }}>دعم العملاء</h2>
          <p style={{ fontSize: "12px", color: "#737373", margin: "4px 0 0 0" }}>تحدث مع وكيل الدعم الذكي</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#737373",
              cursor: "pointer",
              padding: "8px",
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Messages Area - Scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          minHeight: 0,
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              justifyContent: message.role === "user" ? "flex-start" : "flex-end",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                maxWidth: "280px",
                padding: "12px 16px",
                borderRadius: "16px",
                backgroundColor: message.role === "user" ? "#3b82f6" : "#262626",
                color: "#fff",
                fontSize: "14px",
                lineHeight: 1.5,
                wordBreak: "break-word",
                overflowWrap: "anywhere",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
              }}
            >
              {message.role === "assistant" && <Bot size={16} style={{ flexShrink: 0, marginTop: "2px" }} />}
              <span style={{ direction: "rtl", textAlign: "right" }}>{message.content}</span>
              {message.role === "user" && <User size={16} style={{ flexShrink: 0, marginTop: "2px" }} />}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "16px",
                backgroundColor: "#262626",
                color: "#737373",
              }}
            >
              جاري الكتابة...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <form
        onSubmit={handleSubmit}
        style={{
          flexShrink: 0,
          padding: "16px",
          borderTop: "1px solid #262626",
          backgroundColor: "#0a0a0a",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "24px",
              border: "1px solid #262626",
              backgroundColor: "#171717",
              color: "#fff",
              fontSize: "14px",
              outline: "none",
              direction: "rtl",
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: input.trim() && !isLoading ? "#3b82f6" : "#262626",
              color: "#fff",
              cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}

export default SupportChat
