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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://www.chatbase.co/embed.min.js"
    script.async = true
    script.setAttribute("chatbotId", process.env.NEXT_PUBLIC_CHATBOT_ID || "")
    script.setAttribute("domain", process.env.NEXT_PUBLIC_CHATBASE_HOST || "")

    const container = document.getElementById("chatbase-widget-container")
    if (container) {
      container.appendChild(script)
    }

    return () => {
      // Cleanup script if component unmounts
      const existingScript = container?.querySelector("script[chatbotId]")
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [])

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
    <div className="flex flex-col h-full bg-background">
      <div
        id="chatbase-widget-container"
        className="flex-1 w-full"
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      />

      <div className="p-4 border-t border-border space-y-2">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="اكتب رسالتك..."
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="ghost" onClick={handleReportIssue} className="w-full text-xs gap-2">
          <AlertCircle className="w-3 h-3" />
          الإبلاغ عن مشكلة تقنية
        </Button>
      </div>
    </div>
  )
}
