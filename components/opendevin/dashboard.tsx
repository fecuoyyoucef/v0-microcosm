"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Terminal, CheckCircle2, XCircle, Clock, Loader2, Code2, FileCode, GitBranch } from "lucide-react"
import { cn } from "@/lib/utils"
import { OpenDevinClient } from "@/lib/opendevin-client"

interface Task {
  id: string
  description: string
  status: "pending" | "running" | "completed" | "failed"
  result?: any
  logs?: string[]
  code_diff?: string
  created_at: string
  updated_at: string
}

interface OpenDevinDashboardProps {
  initialTasks: Task[]
  userId: string
}

export function OpenDevinDashboard({ initialTasks, userId }: OpenDevinDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTaskDescription, setNewTaskDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  const client = new OpenDevinClient()

  useEffect(() => {
    // Poll for task updates
    const interval = setInterval(async () => {
      const runningTasks = tasks.filter(t => t.status === "running" || t.status === "pending")
      
      for (const task of runningTasks) {
        try {
          const status = await client.getTaskStatus(task.id)
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...status } : t))
        } catch (error) {
          console.error(`[v0] Error polling task ${task.id}:`, error)
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [tasks])

  const handleCreateTask = async () => {
    if (!newTaskDescription.trim()) return

    setIsCreating(true)
    try {
      const newTask = await client.createTask(newTaskDescription, userId)
      setTasks(prev => [newTask, ...prev])
      setNewTaskDescription("")
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error("[v0] Error creating task:", error)
      alert("فشل إنشاء المهمة. تحقق من تشغيل OpenDevin.")
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "running":
        return <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
      case "pending":
        return <Clock className="w-4 h-4 text-slate-500" />
    }
  }

  const getStatusBadge = (status: Task["status"]) => {
    const styles = {
      completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      failed: "bg-red-500/10 text-red-500 border-red-500/20",
      running: "bg-violet-500/10 text-violet-500 border-violet-500/20",
      pending: "bg-slate-500/10 text-slate-500 border-slate-500/20"
    }

    return (
      <Badge variant="outline" className={cn("gap-1.5", styles[status])}>
        {getStatusIcon(status)}
        {status === "running" ? "جاري التنفيذ" : 
         status === "completed" ? "مكتمل" :
         status === "failed" ? "فشل" : "قيد الانتظار"}
      </Badge>
    )
  }

  const filteredTasks = tasks.filter(task => {
    if (activeTab === "all") return true
    return task.status === activeTab
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                OpenDevin Dashboard
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                مدعوم بـ Kimi-K2-Instruct
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 gap-2">
                  <Play className="w-4 h-4" />
                  مهمة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-slate-100">إنشاء مهمة جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Textarea
                    placeholder="اكتب وصف المهمة هنا... مثال: 'أنشئ صفحة تسجيل دخول باستخدام shadcn/ui'"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    className="min-h-[120px] bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                  />
                  <Button
                    onClick={handleCreateTask}
                    disabled={isCreating || !newTaskDescription.trim()}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        جاري الإنشاء...
                      </>
                    ) : (
                      "إنشاء المهمة"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "الكل", count: tasks.length, color: "slate" },
            { label: "جاري التنفيذ", count: tasks.filter(t => t.status === "running").length, color: "violet" },
            { label: "مكتمل", count: tasks.filter(t => t.status === "completed").length, color: "emerald" },
            { label: "فشل", count: tasks.filter(t => t.status === "failed").length, color: "red" }
          ].map((stat, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm">
              <div className="p-6">
                <p className="text-slate-400 text-sm">{stat.label}</p>
                <p className={cn(
                  "text-3xl font-bold mt-2",
                  stat.color === "slate" && "text-slate-100",
                  stat.color === "violet" && "text-violet-400",
                  stat.color === "emerald" && "text-emerald-400",
                  stat.color === "red" && "text-red-400"
                )}>{stat.count}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Tasks List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Tasks */}
          <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm">
            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-slate-950/50 border-slate-800">
                  <TabsTrigger value="all">الكل</TabsTrigger>
                  <TabsTrigger value="running">جاري التنفيذ</TabsTrigger>
                  <TabsTrigger value="completed">مكتمل</TabsTrigger>
                  <TabsTrigger value="failed">فشل</TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[600px] mt-4">
                  <div className="space-y-3">
                    {filteredTasks.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <Terminal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>لا توجد مهام</p>
                      </div>
                    ) : (
                      filteredTasks.map(task => (
                        <button
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className={cn(
                            "w-full text-right p-4 rounded-lg border transition-all",
                            selectedTask?.id === task.id
                              ? "bg-slate-800/50 border-violet-500/50"
                              : "bg-slate-950/30 border-slate-800/30 hover:bg-slate-800/30"
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-slate-100 text-sm line-clamp-2 flex-1">
                              {task.description}
                            </p>
                            {getStatusBadge(task.status)}
                          </div>
                          <p className="text-slate-500 text-xs">
                            {new Date(task.created_at).toLocaleString("ar-SA")}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          </Card>

          {/* Right: Task Details */}
          <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm">
            <div className="p-6">
              {selectedTask ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-slate-100 font-semibold mb-2">تفاصيل المهمة</h3>
                      <p className="text-slate-300 text-sm">{selectedTask.description}</p>
                    </div>
                    {getStatusBadge(selectedTask.status)}
                  </div>

                  <Tabs defaultValue="logs" className="mt-6">
                    <TabsList className="bg-slate-950/50 border-slate-800 w-full">
                      <TabsTrigger value="logs" className="flex-1 gap-2">
                        <Terminal className="w-4 h-4" />
                        السجلات
                      </TabsTrigger>
                      <TabsTrigger value="code" className="flex-1 gap-2">
                        <Code2 className="w-4 h-4" />
                        الكود
                      </TabsTrigger>
                      <TabsTrigger value="result" className="flex-1 gap-2">
                        <FileCode className="w-4 h-4" />
                        النتيجة
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="logs" className="mt-4">
                      <ScrollArea className="h-[450px] rounded-lg bg-slate-950 border border-slate-800 p-4">
                        {selectedTask.logs && selectedTask.logs.length > 0 ? (
                          <div className="space-y-1 font-mono text-xs">
                            {selectedTask.logs.map((log, i) => (
                              <div key={i} className="text-slate-300">{log}</div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-500 text-center py-12">لا توجد سجلات</div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="code" className="mt-4">
                      <ScrollArea className="h-[450px] rounded-lg bg-slate-950 border border-slate-800 p-4">
                        {selectedTask.code_diff ? (
                          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                            {selectedTask.code_diff}
                          </pre>
                        ) : (
                          <div className="text-slate-500 text-center py-12">لا توجد تغييرات في الكود</div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="result" className="mt-4">
                      <ScrollArea className="h-[450px] rounded-lg bg-slate-950 border border-slate-800 p-4">
                        {selectedTask.result ? (
                          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                            {JSON.stringify(selectedTask.result, null, 2)}
                          </pre>
                        ) : (
                          <div className="text-slate-500 text-center py-12">لا توجد نتيجة</div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="text-center py-24 text-slate-500">
                  <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>اختر مهمة لعرض التفاصيل</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
