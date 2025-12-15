"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, MessageSquare, CheckCircle, Clock, Sparkles } from "lucide-react"
import { AdminSupportInsights } from "@/components/admin/admin-support-insights"

interface SupportTicket {
  id: string
  user_id: string
  user_name: string
  type: "bug" | "feature" | "question" | "feedback"
  title: string
  description: string
  status: "open" | "in_progress" | "resolved"
  priority: "low" | "normal" | "high"
  created_at: string
}

const typeConfig = {
  bug: { label: "خطأ", color: "text-red-400", bg: "bg-red-500/10" },
  feature: { label: "اقتراح", color: "text-purple-400", bg: "bg-purple-500/10" },
  question: { label: "سؤال", color: "text-blue-400", bg: "bg-blue-500/10" },
  feedback: { label: "رأي", color: "text-emerald-400", bg: "bg-emerald-500/10" },
}

const statusConfig = {
  open: { label: "مفتوح", color: "text-amber-400", icon: Clock },
  in_progress: { label: "قيد العمل", color: "text-blue-400", icon: RefreshCw },
  resolved: { label: "محلول", color: "text-emerald-400", icon: CheckCircle },
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("insights")

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/admin/support-tickets")
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  const openCount = tickets.filter((t) => t.status === "open").length
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">الدعم والمساعدة</h1>
          <p className="text-slate-400">إدارة طلبات الدعم ورؤى المستخدمين</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTickets}
          className="gap-2 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-white">{openCount}</p>
              <p className="text-sm text-amber-400">مفتوح</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{inProgressCount}</p>
              <p className="text-sm text-blue-400">قيد العمل</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">{resolvedCount}</p>
              <p className="text-sm text-emerald-400">محلول</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="insights" className="data-[state=active]:bg-cyan-600">
            <Sparkles className="w-4 h-4 ml-2" />
            رؤى AI
          </TabsTrigger>
          <TabsTrigger value="tickets" className="data-[state=active]:bg-cyan-600">
            <MessageSquare className="w-4 h-4 ml-2" />
            التذاكر
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="mt-6">
          <AdminSupportInsights />
        </TabsContent>

        <TabsContent value="tickets" className="mt-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y divide-slate-800">
                  {tickets.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد تذاكر دعم حالياً</p>
                    </div>
                  ) : (
                    tickets.map((ticket) => {
                      const type = typeConfig[ticket.type]
                      const status = statusConfig[ticket.status]
                      return (
                        <div key={ticket.id} className="p-4 hover:bg-slate-800/30 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`${type.bg} ${type.color} border-0`}>{type.label}</Badge>
                                <Badge variant="outline" className={`${status.color} border-current`}>
                                  <status.icon className="w-3 h-3 ml-1" />
                                  {status.label}
                                </Badge>
                              </div>
                              <h3 className="font-medium text-white">{ticket.title}</h3>
                              <p className="text-sm text-slate-400 line-clamp-2 mt-1">{ticket.description}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                <span>{ticket.user_name}</span>
                                <span>{new Date(ticket.created_at).toLocaleDateString("ar-SA")}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
