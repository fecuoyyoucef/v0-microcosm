"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, Send, Loader2, Brain, TrendingUp, Users, MessageSquare, Lightbulb } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface Suggestion {
  title: string
  description: string
  priority: "high" | "medium" | "low"
  category: string
}

export default function AIAdminPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch("/api/admin/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
        }),
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        throw new Error("Failed")
      }

      const data = await res.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }])
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "حدث خطأ. حاول مرة أخرى." }])
    } finally {
      setLoading(false)
    }
  }

  const generateSuggestions = async () => {
    setLoadingSuggestions(true)
    try {
      const res = await fetch("/api/admin/ai-suggestions")
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error("Suggestions error:", error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const quickQuestions = [
    "ما هي أهم التحسينات التي يمكن إجراؤها؟",
    "حلل أنماط استخدام التطبيق",
    "ما هي الميزات الأكثر استخداماً؟",
    "اقترح طرق لزيادة تفاعل المستخدمين",
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-400" />
          مساعد الذكاء الاصطناعي
        </h1>
        <p className="text-slate-400">تحليل ذكي واقتراحات لتحسين التطبيق</p>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-900/50">
          <TabsTrigger value="chat" className="data-[state=active]:bg-slate-700 gap-2">
            <MessageSquare className="w-4 h-4" />
            المحادثة
          </TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-slate-700 gap-2">
            <Brain className="w-4 h-4" />
            الرؤى الذكية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Chat Area */}
            <Card className="lg:col-span-3 bg-slate-900/50 border-slate-800 flex flex-col h-[600px]">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-white text-lg">محادثة مع AI</CardTitle>
                <CardDescription>اسأل عن التحليلات والاقتراحات</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center py-12">
                        <Sparkles className="w-12 h-12 mx-auto text-purple-400/50 mb-4" />
                        <p className="text-slate-400">ابدأ محادثة مع المساعد الذكي</p>
                        <p className="text-sm text-slate-500 mt-2">اسأل عن التحليلات أو اطلب اقتراحات</p>
                      </div>
                    )}
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[80%] p-3 rounded-xl ${
                            msg.role === "user"
                              ? "bg-slate-800 text-white"
                              : "bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 text-white"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-end">
                        <div className="bg-purple-500/20 border border-purple-500/30 p-3 rounded-xl">
                          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t border-slate-800">
                  <div className="flex gap-2">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="اكتب سؤالك هنا..."
                      className="bg-slate-800 border-slate-700 text-white resize-none"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={loading || !input.trim()}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Questions */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">أسئلة سريعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    className="w-full justify-start text-right text-slate-300 hover:text-white hover:bg-slate-800 text-sm h-auto py-2 px-3"
                    onClick={() => {
                      setInput(q)
                    }}
                  >
                    {q}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-6 space-y-6">
          {/* Generate Button */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-white">الرؤى والاقتراحات</h2>
              <p className="text-sm text-slate-400">تحليل ذكي لبيانات التطبيق</p>
            </div>
            <Button
              onClick={generateSuggestions}
              disabled={loadingSuggestions}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {loadingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              تحليل وتوليد اقتراحات
            </Button>
          </div>

          {/* Suggestions Grid */}
          {suggestions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((suggestion, i) => (
                <Card key={i} className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-400" />
                        <h3 className="font-medium text-white">{suggestion.title}</h3>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          suggestion.priority === "high"
                            ? "border-red-500/50 text-red-400"
                            : suggestion.priority === "medium"
                              ? "border-amber-500/50 text-amber-400"
                              : "border-slate-500/50 text-slate-400"
                        }`}
                      >
                        {suggestion.priority === "high"
                          ? "عالية"
                          : suggestion.priority === "medium"
                            ? "متوسطة"
                            : "منخفضة"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400">{suggestion.description}</p>
                    <Badge variant="outline" className="mt-3 text-xs border-slate-700 text-slate-500">
                      {suggestion.category}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="py-12 text-center">
                <Brain className="w-12 h-12 mx-auto text-purple-400/50 mb-4" />
                <p className="text-slate-400">اضغط على زر التحليل للحصول على اقتراحات ذكية</p>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats for AI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-xs text-blue-300">تفاعل المستخدمين</p>
                  <p className="text-lg font-bold text-white">جيد</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="text-xs text-emerald-300">نمو الاستخدام</p>
                  <p className="text-lg font-bold text-white">+15%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-xs text-purple-300">ميزات AI نشطة</p>
                  <p className="text-lg font-bold text-white">8</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
