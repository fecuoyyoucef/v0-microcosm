"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Sparkles, Loader2, User, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { useScroll } from "@/lib/contexts/scroll-context"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const { scrollDirection, setScrollDirection } = useScroll()
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastScrollYRef = useRef(0)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null)
    })
  }, [supabase])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current?.querySelector("[data-radix-scroll-area-viewport]")
    if (!scrollContainer) return

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop
      const scrollHeight = scrollContainer.scrollHeight
      const clientHeight = scrollContainer.clientHeight

      if (scrollHeight <= clientHeight) {
        setScrollDirection("up")
        return
      }

      const direction = currentScrollY > lastScrollYRef.current ? "down" : "up"

      if (direction !== scrollDirection) {
        setScrollDirection(direction)
      }

      lastScrollYRef.current = currentScrollY
    }

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll)
    }
  }, [scrollDirection, setScrollDirection])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: input.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai/chat-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userId: currentUserId,
        }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      const data = await response.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }])
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [...prev, { role: "assistant", content: "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى." }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background pb-40">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="h-14 px-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">المساعد الذكي</h1>
            <p className="text-xs text-muted-foreground">مساعدك الشخصي المدعوم بالذكاء الاصطناعي</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea
        ref={scrollContainerRef}
        className="flex-1 p-4 [&>[data-radix-scroll-area-viewport]]:chat-scroll-container"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">مرحباً! كيف يمكنني مساعدتك؟</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                يمكنني مساعدتك في فهم محادثاتك، تلخيص القرارات، اقتراح أفكار، والإجابة على أسئلتك
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 max-w-2xl mx-auto">
                <Card
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setInput("لخص لي آخر القرارات المهمة")}
                >
                  <CardContent className="p-4">
                    <p className="text-sm font-medium">لخص لي آخر القرارات المهمة</p>
                  </CardContent>
                </Card>
                <Card
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setInput("ما هي المواضيع الأكثر نقاشاً؟")}
                >
                  <CardContent className="p-4">
                    <p className="text-sm font-medium">ما هي المواضيع الأكثر نقاشاً؟</p>
                  </CardContent>
                </Card>
                <Card
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setInput("اقترح أفكار لتحسين التواصل")}
                >
                  <CardContent className="p-4">
                    <p className="text-sm font-medium">اقترح أفكار لتحسين التواصل</p>
                  </CardContent>
                </Card>
                <Card
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setInput("ما هي نقاط القوة في مجموعتنا؟")}
                >
                  <CardContent className="p-4">
                    <p className="text-sm font-medium">ما هي نقاط القوة في مجموعتنا؟</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <Avatar className="w-8 h-8 rounded-xl shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  <MarkdownRenderer
                    content={msg.content}
                    className={msg.role === "user" ? "prose-sm text-primary-foreground" : "prose-sm"}
                  />
                </div>

                {msg.role === "user" && (
                  <Avatar className="w-8 h-8 rounded-xl shrink-0">
                    <AvatarFallback className="bg-primary/20 text-primary rounded-xl">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <Avatar className="w-8 h-8 rounded-xl shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className={cn("fixed inset-x-0 z-50 shrink-0 border-t border-border bg-background", "bottom-0")}>
        <div className="p-4 pb-safe">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالتك... (Enter للإرسال)"
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">المساعد الذكي مدعوم بنموذج Groq AI</p>
        </div>
      </div>
    </div>
  )
}
