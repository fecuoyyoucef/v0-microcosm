import { type NextRequest, NextResponse } from "next/server"
import { ContentGuardian, SystemMonitor, AnalyticsBot } from "@/lib/ai-agents/specialized-agents"

export async function POST(request: NextRequest) {
  try {
    const { type, target_id } = await request.json()

    switch (type) {
      case "message":
        const guardian = new ContentGuardian()
        await guardian.monitorMessage(target_id)
        break

      case "system_health":
        const monitor = new SystemMonitor()
        const health = await monitor.checkSystemHealth()
        return NextResponse.json({ health })

      case "daily_report":
        const analytics = new AnalyticsBot()
        const report = await analytics.generateDailyReport()
        return NextResponse.json({ report })

      default:
        return NextResponse.json({ error: "Unknown monitor type" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error in monitor route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
