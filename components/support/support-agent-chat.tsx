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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
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
    <div className="flex flex-col h-[80vh] max-h-[80vh] w-full max-w-full overflow-hidden bg-background rounded-lg shadow-sm border border-border">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-6 scroll-smooth">
        <div className="flex flex-col gap-4 max-w-full">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
            >
              <div
                className={`
                  max-w-[80%] sm:max-w-md px-4 py-3 rounded-2xl shadow-sm
                  break-words whitespace-pre-wrap
                  ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }
                `}
                style={{
                  wordWrap: "break-word",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                <p className="text-[15px] leading-relaxed">{msg.content}</p>
                <span className={`text-[11px] opacity-60 mt-1.5 block`}>
                  {msg.timestamp.toLocaleTimeString("ar-SA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-muted px-5 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-0" />
        </div>
      </div>

      <div className="shrink-0 px-4 py-4 border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="flex gap-2 mb-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="اكتب رسالتك هنا..."
            disabled={loading}
            className="flex-1 rounded-full px-4 py-2.5 text-[15px] border-border/60 focus:border-primary transition-colors"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="rounded-full h-11 w-11 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={handleReportIssue}
          className="w-full text-xs text-muted-foreground hover:text-foreground gap-2 h-8"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          الإبلاغ عن مشكلة تقنية
        </Button>
      </div>
    </div>
  )
}
