"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Send, Bot, User } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function SupportChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "مرحباً! كيف يمكنني مساعدتك اليوم؟",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
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
        throw new Error("Failed")
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
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0a0a0a",
        overflow: "hidden",
      }}
    >
      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          overflowY: "auto",
          padding: "16px",
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
                maxWidth: "75%",
                padding: "12px 16px",
                borderRadius: "16px",
                backgroundColor: message.role === "user" ? "#3b82f6" : "#262626",
                color: "#fff",
                fontSize: "14px",
                lineHeight: "1.5",
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
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        style={{
          flexShrink: 0,
          padding: "16px",
          borderTop: "1px solid #262626",
          backgroundColor: "#0a0a0a",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
