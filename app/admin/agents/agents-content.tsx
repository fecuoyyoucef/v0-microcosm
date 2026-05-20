"use client"

/**
 * Admin dashboard for the Groq-powered agents system.
 *
 * Tabs:
 *   - تشغيل: pick an agent, send a prompt, watch the run live.
 *   - السجلّ: recent runs with their tool calls and tokens.
 *   - الموافقات: pending high-risk actions awaiting decision.
 *   - المقاييس: 24h metrics by agent and by tool.
 */

import { useCallback, useMemo, useState } from "react"
import useSWR from "swr"
import {
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  ShieldAlert,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`)
    return r.json()
  })

interface AgentSummary {
  kind: string
  displayName: string
  description: string
  model: string
  tools: string[]
}

interface ToolCall {
  id: string
  tool_name: string
  arguments: Record<string, unknown>
  result: unknown
  success: boolean | null
  error: string | null
  duration_ms: number | null
  required_approval: boolean
}

interface AgentRunRow {
  id: string
  agent_id: string
  status: string
  steps: number
  tokens_used: number
  duration_ms: number | null
  error: string | null
  started_at: string
  output: unknown
  agent_tool_calls: ToolCall[]
}

interface Approval {
  id: string
  agent_id: string
  tool_name: string
  arguments: Record<string, unknown>
  risk_level: string
  reason: string | null
  requested_at: string
}

interface Metrics {
  totals: {
    runs: number
    failed_runs: number
    success_rate: number
    tokens: number
    avg_duration_ms: number
    pending_approvals: number
  }
  by_agent: Record<string, { total: number; failed: number; tokens: number }>
  by_tool: Record<string, { total: number; failed: number }>
}

export default function ChiefAgentContent() {
  const { toast } = useToast()

  const { data: agentsData } = useSWR<{ agents: AgentSummary[] }>(
    "/api/agents/list",
    fetcher,
  )
  const agents = agentsData?.agents ?? []
  const [activeAgent, setActiveAgent] = useState<string>("chief")

  const [input, setInput] = useState("")
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<AgentRunRow | null>(null)

  const {
    data: runsData,
    mutate: refreshRuns,
    isLoading: runsLoading,
  } = useSWR<{ runs: AgentRunRow[] }>("/api/agents/runs?limit=30", fetcher, {
    refreshInterval: 10_000,
  })
  const {
    data: approvalsData,
    mutate: refreshApprovals,
  } = useSWR<{ approvals: Approval[] }>("/api/agents/approvals", fetcher, {
    refreshInterval: 5_000,
  })
  const { data: metrics } = useSWR<Metrics>("/api/agents/metrics", fetcher, {
    refreshInterval: 15_000,
  })

  const runAgent = useCallback(async () => {
    if (!input.trim()) return
    setRunning(true)
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: activeAgent, input: input.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "فشل التشغيل")
      setLastRun(json.run)
      setInput("")
      refreshRuns()
      toast({ title: "اكتمل التشغيل", description: `الوكيل: ${activeAgent}` })
    } catch (err) {
      toast({
        title: "خطأ",
        description: err instanceof Error ? err.message : "فشل غير متوقع",
        variant: "destructive",
      })
    } finally {
      setRunning(false)
    }
  }, [activeAgent, input, refreshRuns, toast])

  const decide = useCallback(
    async (id: string, decision: "approved" | "rejected") => {
      try {
        const res = await fetch("/api/agents/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, decision }),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? "تعذّر التحديث")
        refreshApprovals()
        toast({ title: decision === "approved" ? "تمت الموافقة" : "تم الرفض" })
      } catch (err) {
        toast({
          title: "خطأ",
          description: err instanceof Error ? err.message : "تعذّر",
          variant: "destructive",
        })
      }
    },
    [refreshApprovals, toast],
  )

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">نظام الوكلاء الذكي</h1>
            <p className="text-sm text-muted-foreground">
              مدعوم بـ Groq — تشغيل وإشراف وتنفيذ آمن
            </p>
          </div>
        </header>

        <MetricsRow metrics={metrics} />

        <Tabs defaultValue="run" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="run">تشغيل</TabsTrigger>
            <TabsTrigger value="history">السجلّ</TabsTrigger>
            <TabsTrigger value="approvals">
              الموافقات
              {(approvalsData?.approvals.length ?? 0) > 0 && (
                <Badge variant="destructive" className="ms-2 h-5 px-1.5 text-[10px]">
                  {approvalsData!.approvals.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="metrics">المقاييس</TabsTrigger>
          </TabsList>

          <TabsContent value="run" className="space-y-4">
            <RunPanel
              agents={agents}
              active={activeAgent}
              setActive={setActiveAgent}
              input={input}
              setInput={setInput}
              running={running}
              onRun={runAgent}
              lastRun={lastRun}
            />
          </TabsContent>

          <TabsContent value="history">
            <HistoryPanel
              runs={runsData?.runs ?? []}
              loading={runsLoading}
              onRefresh={refreshRuns}
            />
          </TabsContent>

          <TabsContent value="approvals">
            <ApprovalsPanel
              approvals={approvalsData?.approvals ?? []}
              onDecide={decide}
            />
          </TabsContent>

          <TabsContent value="metrics">
            <MetricsPanel metrics={metrics} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ===== Subcomponents =====

function MetricsRow({ metrics }: { metrics?: Metrics }) {
  const t = metrics?.totals
  const tiles = [
    { label: "تشغيل (24س)", value: t?.runs ?? 0, icon: Activity, tone: "text-foreground" },
    {
      label: "نسبة النجاح",
      value: t ? `${Math.round(t.success_rate * 100)}%` : "—",
      icon: CheckCircle2,
      tone: "text-primary",
    },
    {
      label: "متوسط الزمن",
      value: t ? `${Math.round(t.avg_duration_ms / 1000)}ث` : "—",
      icon: Clock,
      tone: "text-muted-foreground",
    },
    {
      label: "موافقات معلّقة",
      value: t?.pending_approvals ?? 0,
      icon: ShieldAlert,
      tone: t?.pending_approvals ? "text-destructive" : "text-muted-foreground",
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label} className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn("rounded-lg bg-muted p-2", tile.tone)}>
              <tile.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{tile.label}</div>
              <div className="text-lg font-semibold leading-tight">{tile.value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RunPanel({
  agents,
  active,
  setActive,
  input,
  setInput,
  running,
  onRun,
  lastRun,
}: {
  agents: AgentSummary[]
  active: string
  setActive: (k: string) => void
  input: string
  setInput: (s: string) => void
  running: boolean
  onRun: () => void
  lastRun: AgentRunRow | null
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">اختر الوكيل</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5 p-3">
          {agents.length === 0 && <Skeleton className="h-16 w-full" />}
          {agents.map((a) => (
            <button
              key={a.kind}
              onClick={() => setActive(a.kind)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-start transition",
                active === a.kind
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:bg-muted/50",
              )}
            >
              <div className="font-medium text-foreground">{a.displayName}</div>
              <div className="text-xs text-muted-foreground">{a.description}</div>
              <Badge variant="outline" className="mt-1 font-mono text-[10px]">
                {a.model}
              </Badge>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">المهمة</CardTitle>
            <CardDescription className="text-xs">
              اكتب ما تريد من الوكيل تنفيذه. سيختار الأدوات تلقائياً ويعود بالخلاصة.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="مثال: راجع آخر 10 رسائل في الخلية X وأبلغني عن أي مخالفات."
              rows={4}
              className="resize-none font-sans"
              disabled={running}
            />
            <div className="flex justify-end">
              <Button onClick={onRun} disabled={running || !input.trim()}>
                {running ? (
                  <RefreshCw className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="me-2 h-4 w-4" />
                )}
                تشغيل
              </Button>
            </div>
          </CardContent>
        </Card>

        {lastRun && <RunDetails run={lastRun} defaultOpen />}
      </div>
    </div>
  )
}

function HistoryPanel({
  runs,
  loading,
  onRefresh,
}: {
  runs: AgentRunRow[]
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">آخر التشغيلات</CardTitle>
        <Button size="sm" variant="ghost" onClick={onRefresh}>
          <RefreshCw className="me-2 h-3.5 w-3.5" />
          تحديث
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 p-3">
        {loading && <Skeleton className="h-32 w-full" />}
        {!loading && runs.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            لا توجد تشغيلات بعد.
          </div>
        )}
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-2">
            {runs.map((r) => (
              <RunDetails key={r.id} run={r} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function RunDetails({ run, defaultOpen = false }: { run: AgentRunRow; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const success = run.status === "completed"
  return (
    <div className="rounded-lg border border-border/60 bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-3 text-start"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        {success ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>{run.agent_id}</span>
            <Badge variant="outline" className="text-[10px]">
              {run.steps} خطوة
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {run.tokens_used} رمز
            </Badge>
            {run.duration_ms !== null && (
              <Badge variant="outline" className="text-[10px]">
                {Math.round(run.duration_ms / 100) / 10}ث
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(run.started_at).toLocaleString("ar")}
          </div>
        </div>
      </button>
      {open && (
        <div className="space-y-3 border-t border-border/60 p-3">
          {run.error && (
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {run.error}
            </div>
          )}
          {run.output !== null && run.output !== undefined && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">الخلاصة</div>
              <pre className="overflow-x-auto rounded bg-muted p-2 text-xs leading-relaxed">
                {typeof run.output === "string" ? run.output : JSON.stringify(run.output, null, 2)}
              </pre>
            </div>
          )}
          {run.agent_tool_calls?.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                استدعاءات الأدوات
              </div>
              <div className="space-y-1.5">
                {run.agent_tool_calls.map((c) => (
                  <ToolCallRow key={c.id} call={c} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ToolCallRow({ call }: { call: ToolCall }) {
  return (
    <div className="rounded border border-border/60 bg-background p-2 text-xs">
      <div className="flex items-center gap-2">
        {call.success ? (
          <CheckCircle2 className="h-3 w-3 text-primary" />
        ) : call.success === false ? (
          <XCircle className="h-3 w-3 text-destructive" />
        ) : (
          <Clock className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="font-mono font-medium">{call.tool_name}</span>
        {call.required_approval && (
          <Badge variant="outline" className="text-[10px]">
            موافقة
          </Badge>
        )}
        {call.duration_ms !== null && (
          <span className="ms-auto text-muted-foreground">{call.duration_ms}مللي</span>
        )}
      </div>
      <pre className="mt-1 overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">
        {JSON.stringify(call.arguments, null, 2)}
      </pre>
      {call.error && <div className="mt-1 text-[11px] text-destructive">{call.error}</div>}
    </div>
  )
}

function ApprovalsPanel({
  approvals,
  onDecide,
}: {
  approvals: Approval[]
  onDecide: (id: string, d: "approved" | "rejected") => void
}) {
  if (approvals.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          لا توجد موافقات معلّقة.
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="space-y-3">
      {approvals.map((a) => (
        <Card key={a.id} className="border-border/60">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="font-mono">{a.tool_name}</span>
                  <Badge variant={riskTone(a.risk_level)} className="text-[10px]">
                    {a.risk_level}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  من {a.agent_id} • {new Date(a.requested_at).toLocaleString("ar")}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => onDecide(a.id, "rejected")}>
                  رفض
                </Button>
                <Button size="sm" onClick={() => onDecide(a.id, "approved")}>
                  موافقة
                </Button>
              </div>
            </div>
            {a.reason && <div className="rounded bg-muted p-2 text-xs">{a.reason}</div>}
            <pre className="overflow-x-auto rounded bg-muted p-2 text-[11px] leading-relaxed">
              {JSON.stringify(a.arguments, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function riskTone(level: string): "default" | "secondary" | "destructive" | "outline" {
  switch (level) {
    case "critical":
    case "high":
      return "destructive"
    case "medium":
      return "default"
    default:
      return "secondary"
  }
}

function MetricsPanel({ metrics }: { metrics?: Metrics }) {
  const byAgent = useMemo(
    () => (metrics ? Object.entries(metrics.by_agent) : []),
    [metrics],
  )
  const byTool = useMemo(
    () => (metrics ? Object.entries(metrics.by_tool) : []),
    [metrics],
  )

  if (!metrics) return <Skeleton className="h-64 w-full" />

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">حسب الوكيل (24س)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3">
          {byAgent.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">لا بيانات</div>
          )}
          {byAgent.map(([agent, stats]) => (
            <div
              key={agent}
              className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="font-medium">{agent}</span>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{stats.total} تشغيل</span>
                <span className="text-destructive">{stats.failed} فشل</span>
                <span>{stats.tokens} رمز</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">حسب الأداة (24س)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3">
          {byTool.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">لا بيانات</div>
          )}
          {byTool.map(([tool, stats]) => (
            <div
              key={tool}
              className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="font-mono text-xs">{tool}</span>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{stats.total}</span>
                <span className="text-destructive">{stats.failed} فشل</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
