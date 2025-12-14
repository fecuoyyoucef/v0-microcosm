import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getAIModel } from "@/lib/ai"
import { generateText } from "ai"

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    const { data: openIssues } = await supabase.from("user_issue_reports").select("*").eq("status", "open")

    const { data: patterns } = await supabase
      .from("recurring_issue_patterns")
      .select("*")
      .order("occurrence_count", { ascending: false })
      .limit(10)

    const criticalCount = openIssues?.filter((i) => i.severity === "critical").length || 0

    const patternsSummary = patterns?.map((p) => ({
      description: p.pattern_description,
      count: p.occurrence_count,
      users: p.affected_users,
    }))

    const { text } = await generateText({
      model: getAIModel(),
      prompt: `أنت محلل بيانات لتطبيق Microcosm. لديك البيانات التالية عن المشاكل والأنماط المتكررة:

عدد المشاكل المفتوحة: ${openIssues?.length || 0}
المشاكل الحرجة: ${criticalCount}

الأنماط المتكررة:
${JSON.stringify(patternsSummary, null, 2)}

اقترح 3-5 إجراءات ملموسة يجب على المالك اتخاذها لتحسين التطبيق. كن مختصراً ومحدداً.

أجب بصيغة JSON:
{
  "recommended_actions": ["إجراء 1", "إجراء 2", ...]
}`,
    })

    let recommendations: string[] = []
    try {
      const parsed = JSON.parse(text)
      recommendations = parsed.recommended_actions || []
    } catch {
      recommendations = ["راجع الأنماط المتكررة", "ركّز على المشاكل الحرجة", "تواصل مع المستخدمين المتأثرين"]
    }

    return NextResponse.json({
      total_open_issues: openIssues?.length || 0,
      critical_issues: criticalCount,
      common_patterns: patterns || [],
      recommended_actions: recommendations,
    })
  } catch (error) {
    console.error("Support insights error:", error)
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 })
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
    const supabase = await createClient()

    if (action === "acknowledge") {
      await supabase.from("recurring_issue_patterns").update({ admin_status: "acknowledged" }).eq("id", patternId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Pattern update error:", error)
    return NextResponse.json({ error: "Failed to update pattern" }, { status: 500 })
  }
}
