import { ChiefAgent } from "./chief-agent"
import { createServiceClient } from "@/lib/supabase/server"

export class SystemMonitor {
  private agent = new ChiefAgent()
  private supabase = createServiceClient()

  // Monitor new messages for violations
  async monitorMessage(messageId: string) {
    const isEnabled = await this.agent.isEnabled()
    if (!isEnabled) return

    const { data: message } = await this.supabase.from("messages").select("*, profiles(*)").eq("id", messageId).single()

    if (!message) return

    // Check for violations
    const violations = await this.detectViolations(message)

    if (violations.length > 0) {
      const scenario = `رسالة من المستخدم ${message.profiles.username || message.profiles.full_name} تحتوي على: ${violations.join("، ")}`

      const decision = await this.agent.makeDecision(scenario, {
        message_id: messageId,
        user_id: message.user_id,
        group_id: message.group_id,
      })

      if (decision.auto_execute && decision.confidence >= 85) {
        await this.agent.executeAction(decision, {
          message_id: messageId,
          user_id: message.user_id,
        })
      }
    }
  }

  // Monitor reports
  async monitorReport(reportId: string) {
    const isEnabled = await this.agent.isEnabled()
    if (!isEnabled) return

    const { data: report } = await this.supabase
      .from("support_tickets")
      .select("*, profiles(*)")
      .eq("id", reportId)
      .single()

    if (!report || report.category !== "report") return

    const scenario = `بلاغ من ${report.profiles.username} بعنوان: ${report.title}\n${report.message}`

    const decision = await this.agent.makeDecision(scenario, {
      report_id: reportId,
      target_id: report.related_entity_id,
    })

    if (decision.severity === "critical" && decision.confidence >= 90) {
      await this.agent.executeAction(decision, {
        report_id: reportId,
      })
    }
  }

  // Detect violations in message
  private async detectViolations(message: any): Promise<string[]> {
    const violations: string[] = []
    const content = message.content.toLowerCase()

    // Check for spam patterns
    if (content.includes("http") && content.split("http").length > 3) {
      violations.push("spam محتمل (روابط كثيرة)")
    }

    // Check for offensive content
    const offensiveWords = ["كلمات_سيئة_هنا"] // يمكن توسيعها
    if (offensiveWords.some((word) => content.includes(word))) {
      violations.push("محتوى مسيء")
    }

    // Check for excessive caps
    const capsPercentage = (content.match(/[A-Z]/g) || []).length / content.length
    if (capsPercentage > 0.7 && content.length > 20) {
      violations.push("صراخ (أحرف كبيرة كثيرة)")
    }

    // Check message frequency (flood)
    const { count } = await this.supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", message.user_id)
      .gte("created_at", new Date(Date.now() - 60000).toISOString())

    if (count && count > 10) {
      violations.push("flood (رسائل كثيرة جداً)")
    }

    return violations
  }
}

export const systemMonitor = new SystemMonitor()
