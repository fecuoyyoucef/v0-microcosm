"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, Send, X, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function SupportAgentChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "مرحباً! أنا وكيل الدعم الذكي. كيف يمكنني مساعدتك اليوم؟",
          timestamp: new Date(),
        },
      ])
    }
  }, [isOpen])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
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
        console.error("[v0] Support chat API error:", response.status)
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
      console.error("[v0] Support chat error:", error)

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
    setIsOpen(false)
    window.location.href = "/chat/support/report"
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 rounded-full w-14 h-14 shadow-lg bg-cyan-600 hover:bg-cyan-700 z-40"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-6 left-6 w-96 h-[500px] bg-slate-800 border-slate-700 text-white shadow-2xl z-40 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold">وكيل الدعم</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === "user" ? "bg-cyan-600" : "bg-slate-700"}`}>
                <p className="text-sm">{msg.content}</p>
                <span className="text-xs text-slate-400 mt-1 block">
                  {msg.timestamp.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-700 p-3 rounded-lg">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-700 space-y-2">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="اكتب رسالتك..."
            className="bg-slate-700 border-slate-600"
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={handleReportIssue}
          className="w-full text-xs text-slate-400 hover:text-white gap-2"
        >
          <AlertCircle className="w-3 h-3" />
          الإبلاغ عن مشكلة تقنية
        </Button>
      </div>
    </Card>
  )
}
