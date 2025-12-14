"use client"

import { useState, useEffect } from "react"
import { Bot, Send, Loader2, TrendingUp, AlertCircle, Lightbulb, Pin, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface Message {
  role: "user" | "assistant"
  content: string
  id: string
  timestamp: Date
  pinned?: boolean
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
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("admin_ai_chat_history")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })))
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("admin_ai_chat_history", JSON.stringify(messages))
    }
  }, [messages])

  const sendMessage = async (query?: string) => {
    const messageText = query || input
    if (!messageText.trim() || loading) return

    const newUserMessage: Message = {
      role: "user",
      content: messageText,
      id: Date.now().toString(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newUserMessage])
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
        const assistantMessage: Message = {
          role: "assistant",
          content: response,
          id: (Date.now() + 1).toString(),
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        const assistantMessage: Message = {
          role: "assistant",
          content: "حدث خطأ. حاول مرة أخرى.",
          id: (Date.now() + 1).toString(),
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch {
      const assistantMessage: Message = {
        role: "assistant",
        content: "فشل الاتصال بالمساعد.",
        id: (Date.now() + 1).toString(),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setLoading(false)
    }
  }

  const togglePin = (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)))
  }

  const saveAsDevNote = async (message: Message) => {
    try {
      const res = await fetch("/api/admin/dev-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `[مساعد AI - ${new Date(message.timestamp).toLocaleString("ar-SA")}]\n\n${message.content}`,
          status: "pending",
          priority: "normal",
        }),
      })

      if (res.ok) {
        alert("تم حفظ الملاحظة بنجاح!")
      }
    } catch {
      alert("فشل حفظ الملاحظة")
    }
  }

  const clearHistory = () => {
    if (confirm("هل أنت متأكد من حذف سجل المحادثة؟")) {
      setMessages([])
      localStorage.removeItem("admin_ai_chat_history")
    }
  }

  const pinnedMessages = messages.filter((m) => m.pinned)

  return (
    <>
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-white">المساعد الذكي</CardTitle>
                <p className="text-xs text-slate-400">مدعوم بـ Groq AI</p>
              </div>
            </div>
            <div className="flex gap-2">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(true)}
                  className="text-slate-400 hover:text-white"
                >
                  سجل المحادثة ({messages.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400 text-center py-4">
                اسأل المساعد الذكي عن أي شيء يتعلق بإدارة التطبيق
              </p>
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
            <ScrollArea className="h-96">
              <div className="space-y-3 pr-4">
                {messages.slice(-10).map((msg) => (
                  <div key={msg.id} className="group relative">
                    <div className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-purple-400" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] p-3 rounded-lg text-sm ${
                          msg.role === "user" ? "bg-cyan-600 text-white" : "bg-slate-700/50 text-slate-100"
                        } ${msg.pinned ? "ring-2 ring-yellow-500/50" : ""}`}
                      >
                        {msg.content}
                        {msg.role === "assistant" && (
                          <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => togglePin(msg.id)}
                              className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-yellow-400"
                              title={msg.pinned ? "إلغاء التثبيت" : "تثبيت"}
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => saveAsDevNote(msg)}
                              className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-green-400 text-xs"
                              title="حفظ كملاحظة تطوير"
                            >
                              حفظ
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    </div>
                    <div className="max-w-[80%] p-3 rounded-lg bg-slate-700/50 text-sm text-slate-400">
                      جاري التفكير...
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
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

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-slate-900 border-slate-700">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white">سجل المحادثة مع المساعد</DialogTitle>
              <Button variant="ghost" size="sm" onClick={clearHistory} className="text-red-400 hover:text-red-300">
                <Trash2 className="w-4 h-4 mr-2" />
                مسح السجل
              </Button>
            </div>
          </DialogHeader>

          {pinnedMessages.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
                <Pin className="w-4 h-4 text-yellow-400" />
                الملاحظات المثبتة ({pinnedMessages.length})
              </h3>
              <div className="space-y-2 p-3 bg-slate-800/50 rounded-lg">
                {pinnedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2 bg-slate-700/50 rounded text-sm text-slate-200 flex items-start justify-between gap-2"
                  >
                    <div className="flex-1">{msg.content}</div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => saveAsDevNote(msg)}
                        className="p-1 rounded hover:bg-slate-600 text-green-400 text-xs"
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => togglePin(msg.id)}
                        className="p-1 rounded hover:bg-slate-600 text-slate-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pr-4">
              {messages.map((msg) => (
                <div key={msg.id} className="group">
                  <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-purple-400" />
                      </div>
                    )}
                    <div className="max-w-[70%]">
                      <div
                        className={`p-3 rounded-lg text-sm ${
                          msg.role === "user" ? "bg-cyan-600 text-white" : "bg-slate-700/50 text-slate-100"
                        } ${msg.pinned ? "ring-2 ring-yellow-500/50" : ""}`}
                      >
                        {msg.content}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        {new Date(msg.timestamp).toLocaleString("ar-SA")}
                        {msg.pinned && (
                          <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                            مثبت
                          </Badge>
                        )}
                      </div>
                      {msg.role === "assistant" && (
                        <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => togglePin(msg.id)}
                            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                          >
                            {msg.pinned ? "إلغاء التثبيت" : "تثبيت"}
                          </button>
                          <button
                            onClick={() => saveAsDevNote(msg)}
                            className="text-xs px-2 py-1 rounded bg-green-600/20 hover:bg-green-600/30 text-green-400"
                          >
                            حفظ كملاحظة
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
