import { createServiceClient } from "@/lib/supabase/server"
import { ChiefAgent } from "./chief-agent"
import { generateText } from "ai"

export class ContentGuardian {
  private supabase = createServiceClient()
  private chief = new ChiefAgent()

  async monitorMessage(messageId: string): Promise<void> {
    const { data: message } = await this.supabase
      .from("messages")
      .select("*, author:profiles(*), group:groups(*)")
      .eq("id", messageId)
      .single()

    if (!message) return

    const analysis = await this.analyzeContent(message)

    if (analysis.is_violation) {
      await this.chief.makeDecision(`Content violation detected: ${analysis.violation_type}`, {
        message_id: messageId,
        user_id: message.author_id,
        group_id: message.group_id,
        additional_data: analysis,
      })
    }
  }

  private async analyzeContent(message: any): Promise<any> {
    const prompt = `Analyze this message for policy violations:

Content: "${message.content}"
Has images: ${message.image_urls?.length > 0}
Has files: ${message.file_urls?.length > 0}

Check for:
1. Spam or promotional content
2. Harassment or hate speech
3. Explicit or inappropriate content
4. Misinformation
5. Scams or phishing

Respond in JSON:
{
  "is_violation": true/false,
  "violation_type": "spam|harassment|explicit|misinformation|scam|none",
  "confidence": 85,
  "reasoning": "explanation",
  "recommended_action": "delete|warn|ban"
}`

    const { text } = await generateText({
      model: "xai/grok-beta",
      prompt,
      temperature: 0.2,
    })

    return JSON.parse(text)
  }
}

export class UserManager {
  private supabase = createServiceClient()
  private chief = new ChiefAgent()

  async monitorUserBehavior(userId: string): Promise<void> {
    const behavior = await this.analyzeUserBehavior(userId)

    if (behavior.is_suspicious) {
      await this.chief.makeDecision(`Suspicious user behavior detected: ${behavior.issue_type}`, {
        user_id: userId,
        additional_data: behavior,
      })
    }
  }

  private async analyzeUserBehavior(userId: string): Promise<any> {
    // Get user statistics
    const { data: user } = await this.supabase.from("profiles").select("*").eq("id", userId).single()

    const { data: messages } = await this.supabase
      .from("messages")
      .select("id, created_at")
      .eq("author_id", userId)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const { data: groups } = await this.supabase
      .from("group_members")
      .select("joined_at")
      .eq("user_id", userId)
      .gte("joined_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const messagesPerHour = (messages?.length || 0) / 24
    const groupsJoinedToday = groups?.length || 0

    const prompt = `Analyze this user behavior:

Messages in last 24h: ${messages?.length || 0} (${messagesPerHour.toFixed(1)}/hour)
Groups joined today: ${groupsJoinedToday}
Account age: ${Math.floor((Date.now() - new Date(user?.created_at).getTime()) / (1000 * 60 * 60 * 24))} days

Is this suspicious? Consider:
- Spam bots (high message rate)
- Fake accounts (new + high activity)
- Mass joiners

Respond in JSON:
{
  "is_suspicious": true/false,
  "issue_type": "spam_bot|fake_account|mass_joiner|none",
  "confidence": 85,
  "reasoning": "explanation",
  "recommended_action": "warn|temp_ban|permanent_ban|monitor"
}`

    const { text } = await generateText({
      model: "xai/grok-beta",
      prompt,
      temperature: 0.2,
    })

    return JSON.parse(text)
  }
}

export class SystemMonitor {
  private supabase = createServiceClient()

  async checkSystemHealth(): Promise<any> {
    const checks = await Promise.all([this.checkDatabaseHealth(), this.checkErrorRate(), this.checkPerformance()])

    const issues = checks.filter((c) => !c.healthy)

    if (issues.length > 0) {
      await this.reportIssues(issues)
    }

    return {
      healthy: issues.length === 0,
      checks,
      issues,
    }
  }

  private async checkDatabaseHealth(): Promise<any> {
    try {
      const { data, error } = await this.supabase.from("profiles").select("id").limit(1)

      return {
        name: "Database Connection",
        healthy: !error,
        error: error?.message,
      }
    } catch (error: any) {
      return {
        name: "Database Connection",
        healthy: false,
        error: error.message,
      }
    }
  }

  private async checkErrorRate(): Promise<any> {
    const { data: errors } = await this.supabase
      .from("error_logs")
      .select("id")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())

    const errorCount = errors?.length || 0
    const threshold = 50

    return {
      name: "Error Rate",
      healthy: errorCount < threshold,
      error: errorCount >= threshold ? `High error rate: ${errorCount} errors in last hour` : null,
      count: errorCount,
    }
  }

  private async checkPerformance(): Promise<any> {
    const start = Date.now()

    await this.supabase.from("messages").select("id").limit(100)

    const duration = Date.now() - start
    const threshold = 1000

    return {
      name: "Database Performance",
      healthy: duration < threshold,
      error: duration >= threshold ? `Slow query: ${duration}ms` : null,
      duration,
    }
  }

  private async reportIssues(issues: any[]): Promise<void> {
    for (const issue of issues) {
      await this.supabase.from("agent_error_reports").insert({
        agent_id: await this.getAgentId("system_monitor"),
        error_type: "system_health",
        error_message: issue.error,
        severity: "high",
        context: issue,
        requires_v0: true,
      })
    }
  }

  private async getAgentId(type: string): Promise<string> {
    const { data } = await this.supabase.from("ai_agents").select("id").eq("agent_type", type).single()

    return data?.id || ""
  }
}

export class AnalyticsBot {
  private supabase = createServiceClient()

  async generateDailyReport(): Promise<any> {
    const stats = await this.collectDailyStats()
    const insights = await this.generateInsights(stats)

    // Save report
    await this.supabase.from("agent_reports").insert({
      agent_id: await this.getAgentId(),
      report_type: "daily_analytics",
      report_data: { stats, insights },
    })

    // Notify owner
    const { data: owner } = await this.supabase.from("profiles").select("id").eq("is_owner", true).single()

    if (owner) {
      await this.supabase.from("notifications").insert({
        user_id: owner.id,
        title: "تقرير يومي من الوكيل التحليلي",
        body: `إحصائيات اليوم: ${stats.new_users} مستخدم جديد، ${stats.new_messages} رسالة، ${stats.active_cells} خلية نشطة`,
        type: "system",
      })
    }

    return { stats, insights }
  }

  private async collectDailyStats(): Promise<any> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [users, messages, cells, decisions] = await Promise.all([
      this.supabase.from("profiles").select("id").gte("created_at", yesterday),
      this.supabase.from("messages").select("id").gte("created_at", yesterday),
      this.supabase.from("groups").select("id").gte("created_at", yesterday),
      this.supabase.from("agent_actions").select("id").gte("created_at", yesterday),
    ])

    return {
      new_users: users.data?.length || 0,
      new_messages: messages.data?.length || 0,
      new_cells: cells.data?.length || 0,
      agent_actions: decisions.data?.length || 0,
    }
  }

  private async generateInsights(stats: any): Promise<string[]> {
    const insights: string[] = []

    if (stats.new_users > 50) {
      insights.push("نمو كبير في عدد المستخدمين الجدد")
    }

    if (stats.new_messages > 1000) {
      insights.push("نشاط عالٍ جداً في المحادثات")
    }

    if (stats.agent_actions > 20) {
      insights.push("عدد كبير من التدخلات - قد يحتاج مراجعة")
    }

    return insights
  }

  private async getAgentId(): Promise<string> {
    const { data } = await this.supabase.from("ai_agents").select("id").eq("agent_type", "analytics").single()

    return data?.id || ""
  }
}

export class CommunityManager {
  private supabase = createServiceClient()

  async welcomeNewUser(userId: string): Promise<void> {
    const { data: user } = await this.supabase.from("profiles").select("*").eq("id", userId).single()

    if (!user) return

    await this.supabase.from("notifications").insert({
      user_id: userId,
      title: `مرحباً ${user.name}! 👋`,
      body: "نحن سعداء بانضمامك إلى Synaptic Space. استكشف الخلايا وابدأ المحادثات!",
      type: "system",
    })
  }

  async suggestCells(userId: string): Promise<void> {
    // Get user interests (could be from profile or activity)
    const { data: popularCells } = await this.supabase
      .from("groups")
      .select("id, name")
      .eq("visibility", "public")
      .order("members_count", { ascending: false })
      .limit(5)

    if (popularCells && popularCells.length > 0) {
      const cellNames = popularCells.map((c) => c.name).join("، ")

      await this.supabase.from("notifications").insert({
        user_id: userId,
        title: "خلايا قد تهمك",
        body: `جرب الانضمام إلى: ${cellNames}`,
        type: "system",
      })
    }
  }
}
