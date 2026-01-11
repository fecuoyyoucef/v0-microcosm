"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"

type Message = {
  id: string
  content: string
  sender: "user" | "agent"
  timestamp: Date
}

export default function SupportChatV2() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "مرحباً! كيف يمكنني مساعدتك اليوم؟",
      sender: "agent",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("https://www.chatbase.co/api/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatbotId: process.env.NEXT_PUBLIC_CHATBOT_ID,
          messages: [{ content: input, role: "user" }],
          stream: false,
        }),
      })

      const data = await response.json()

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.text || "عذراً، حدث خطأ. حاول مرة أخرى.",
        sender: "agent",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, agentMessage])
    } catch (error) {
      console.error("Error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "عذراً، حدث خطأ في الاتصال. حاول مرة أخرى لاحقاً.",
        sender: "agent",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        backgroundColor: "#0a0a0a",
        color: "#ffffff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid #1f1f1f",
          backgroundColor: "#0f0f0f",
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            margin: 0,
            textAlign: "center",
          }}
        >
          دعم العملاء
        </h2>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#888",
            margin: "0.25rem 0 0 0",
            textAlign: "center",
          }}
        >
          تحدث مع وكيل الدعم الذكي
        </p>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          minHeight: 0,
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              justifyContent: message.sender === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "75%",
                padding: "0.75rem 1rem",
                borderRadius: "1rem",
                backgroundColor: message.sender === "user" ? "#3b82f6" : "#1f1f1f",
                color: "#ffffff",
                wordWrap: "break-word",
                overflowWrap: "anywhere",
                whiteSpace: "pre-wrap",
              }}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "1rem",
                backgroundColor: "#1f1f1f",
                color: "#888",
              }}
            >
              جاري الكتابة...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid #1f1f1f",
          backgroundColor: "#0f0f0f",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-end",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="اكتب رسالتك هنا..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "0.75rem",
              border: "1px solid #2f2f2f",
              backgroundColor: "#1a1a1a",
              color: "#ffffff",
              fontSize: "0.95rem",
              resize: "none",
              minHeight: "2.5rem",
              maxHeight: "8rem",
              fontFamily: "inherit",
              outline: "none",
            }}
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = "auto"
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            style={{
              padding: "0.75rem",
              borderRadius: "0.75rem",
              backgroundColor: input.trim() && !isLoading ? "#3b82f6" : "#2f2f2f",
              color: input.trim() && !isLoading ? "#ffffff" : "#666",
              border: "none",
              cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              width: "2.5rem",
              height: "2.5rem",
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
