"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function SupportAgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "مرحباً! أنا وكيل الدعم الذكي. كيف يمكنني مساعدتك اليوم؟",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          conversationId,
          history: messages,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (data.conversationId) {
        setConversationId(data.conversationId)
      }

      if (data.issueDetected) {
        toast.info("تم اكتشاف مشكلة محتملة. سنراجعها قريباً", {
          icon: <AlertCircle className="w-4 h-4" />,
        })
      }
    } catch (error) {
      const fallbackMessage: Message = {
        role: "assistant",
        content: "عذراً، لا يمكنني الإجابة الآن. يرجى المحاولة لاحقاً أو الإبلاغ عن المشكلة.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, fallbackMessage])
      toast.error("عذراً، حدث خطأ. حاول مرة أخرى")
    } finally {
      setLoading(false)
    }
  }

  const handleReportIssue = () => {
    window.location.href = "/chat/support/report"
  }

  return (
    // The iframe has a fixed height, so h-full will respect that constraint
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card">
        <h2 className="text-lg font-semibold text-center">دعم العملاء</h2>
        <p className="text-xs text-muted-foreground text-center">تحدث مع وكيل الدعم الذكي</p>
      </div>

      {/* flex-1 + min-h-0 is the key combo for proper flex scrolling */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
        <div className="flex flex-col gap-3">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`
                  max-w-[85%] px-4 py-2.5 rounded-2xl
                  ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }
                `}
                style={{
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <span className="text-[10px] opacity-60 mt-1 block">
                  {msg.timestamp.toLocaleTimeString("ar-SA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 p-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="اكتب رسالتك..."
            disabled={loading}
            className="flex-1 rounded-full px-4 text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="rounded-full shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="ghost" onClick={handleReportIssue} className="w-full mt-2 text-xs text-muted-foreground h-7">
          <AlertCircle className="w-3 h-3 ml-1" />
          الإبلاغ عن مشكلة
        </Button>
      </div>
    </div>
  )
}
