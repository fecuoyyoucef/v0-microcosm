import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { generateAIChat } from "@/lib/ai"

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[v0] Fetching support insights...")
    const supabase = await createClient()

    const { data: conversations, error: convError } = await supabase
      .from("support_conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    if (convError) {
      console.error("[v0] Error fetching conversations:", convError)
    }

    console.log("[v0] Found conversations:", conversations?.length || 0)

    // جلب البلاغات الرسمية أيضاً
    const { data: reports, error: reportsError } = await supabase
      .from("user_issue_reports")
      .select("*")
      .order("created_at", { ascending: false })

    if (reportsError) {
      console.error("[v0] Error fetching reports:", reportsError)
    }

    console.log("[v0] Found reports:", reports?.length || 0)

    const openIssues = reports?.filter((r) => r.status === "open") || []
    const criticalCount = reports?.filter((r) => r.severity === "critical").length || 0

    const issuesFromConversations =
      conversations
        ?.filter((c) => c.issue_detected)
        .map((c) => ({
          issue: c.issue_detected,
          user_id: c.user_id,
          created_at: c.created_at,
        })) || []

    console.log("[v0] Issues from conversations:", issuesFromConversations.length)

    let patterns: any[] = []
    let recommendations: string[] = []

    if (issuesFromConversations.length > 0 || reports?.length > 0) {
      try {
        console.log("[v0] Analyzing patterns with AI...")

        const allIssues = [
          ...issuesFromConversations.map((i) => i.issue),
          ...(reports?.map((r) => r.issue_description) || []),
        ]

        const text = await generateAIChat({
          prompt: `أنت محلل بيانات لتطبيق Synaptic Space. لديك ${allIssues.length} بلاغ من المستخدمين.

البلاغات:
${allIssues
  .slice(0, 20)
  .map((issue, i) => `${i + 1}. ${issue}`)
  .join("\n")}

قم بما يلي:
1. حدد الأنماط المتكررة (المشاكل المشتركة)
2. صنف كل نمط حسب الأولوية (high/medium/low)
3. اقترح 3-5 إجراءات عملية لحل المشاكل

أجب بصيغة JSON:
{
  "patterns": [
    {
      "description": "وصف المشكلة",
      "count": عدد التكرارات,
      "priority": "high/medium/low",
      "affected_users": عدد تقريبي
    }
  ],
  "recommended_actions": ["إجراء 1", "إجراء 2", ...]
}`,
        })

        console.log("[v0] AI response:", text)

        const parsed = JSON.parse(text)
        patterns = parsed.patterns || []
        recommendations = parsed.recommended_actions || []

        console.log("[v0] Patterns found:", patterns.length)
      } catch (aiError) {
        console.error("[v0] AI analysis error:", aiError)
        patterns = [
          {
            id: "1",
            pattern_description: "مشاكل عامة في الأداء",
            occurrence_count: issuesFromConversations.length,
            affected_users: new Set(issuesFromConversations.map((i) => i.user_id)).size,
            priority: "medium",
            admin_status: "pending",
          },
        ]
        recommendations = [
          "مراجعة جميع البلاغات المفتوحة",
          "التواصل مع المستخدمين المتأثرين",
          "تحسين توثيق الأخطاء الشائعة",
        ]
      }
    } else {
      recommendations = ["لا توجد بلاغات حالياً", "استمر في مراقبة جودة الخدمة"]
    }

    const formattedPatterns = patterns.map((p, idx) => ({
      id: String(idx + 1),
      pattern_type: "user_reported",
      pattern_description: p.description || "مشكلة عامة",
      occurrence_count: p.count || 1,
      affected_users: p.affected_users || 1,
      priority: p.priority || "medium",
      admin_status: "pending",
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    }))

    return NextResponse.json({
      total_open_issues: openIssues.length + issuesFromConversations.length,
      critical_issues: criticalCount,
      common_patterns: formattedPatterns,
      user_feedback_themes: [],
      recommended_actions: recommendations,
    })
  } catch (error) {
    console.error("[v0] Support insights error:", error)
    return NextResponse.json(
      {
        total_open_issues: 0,
        critical_issues: 0,
        common_patterns: [],
        user_feedback_themes: [],
        recommended_actions: ["حدث خطأ في جلب البيانات"],
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { patternId, action } = await request.json()

    console.log("[v0] Pattern action:", { patternId, action })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Pattern update error:", error)
    return NextResponse.json({ error: "Failed to update pattern" }, { status: 500 })
  }
}
