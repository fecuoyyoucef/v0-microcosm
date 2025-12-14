"use client"

import { useState } from "react"
import { Bot, Send, Loader2, TrendingUp, AlertCircle, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

interface Message {
  role: "user" | "assistant"
  content: string
}

const quickActions = [
  {
    label: "تحليل نشاط المستخدمين",
    query: "حلل نشاط المستخدمين وأعطني رؤى حول أكثر الأوقات نشاطاً",
    icon: TrendingUp,
  },
  {
    label: "اقتراحات لتحسين التفاعل",
    query: "بناءً على البيانات، ما هي أفضل طريقة لزيادة تفاعل المستخدمين؟",
    icon: Lightbulb,
  },
  {
    label: "تحديد المشاكل المحتملة",
    query: "هل هناك أي مشاكل أو أنماط غير طبيعية في بيانات التطبيق؟",
    icon: AlertCircle,
  },
]

export function AIAssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const sendMessage = async (query?: string) => {
    const messageText = query || input
    if (!messageText.trim() || loading) return

    setMessages((prev) => [...prev, { role: "user", content: messageText }])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/admin/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: messageText }),
      })

      if (res.ok) {
        const { response } = await res.json()
        setMessages((prev) => [...prev, { role: "assistant", content: response }])
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "حدث خطأ. حاول مرة أخرى." }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "فشل الاتصال بالمساعد." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">المساعد الذكي</h3>
            <p className="text-xs text-slate-400">مدعوم بـ Groq AI</p>
          </div>
        </div>

        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400 text-center py-4">اسأل المساعد الذكي عن أي شيء يتعلق بإدارة التطبيق</p>
            <div className="grid gap-2">
              {quickActions.map((action, idx) => {
                const Icon = action.icon
                return (
                  <button
                    key={idx}
                    onClick={() => sendMessage(action.query)}
                    disabled={loading}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-right disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-sm text-white">{action.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="max-h-96 overflow-y-auto space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-purple-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    msg.role === "user" ? "bg-cyan-600 text-white" : "bg-slate-700/50 text-slate-100"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                </div>
                <div className="max-w-[80%] p-3 rounded-lg bg-slate-700/50 text-sm text-slate-400">جاري التفكير...</div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="اسأل المساعد..."
            className="bg-slate-700 border-slate-600 resize-none"
            rows={2}
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="bg-cyan-600 hover:bg-cyan-700 shrink-0"
            size="icon"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
