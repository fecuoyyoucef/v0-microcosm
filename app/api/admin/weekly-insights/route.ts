import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getAIModel } from "@/lib/ai"
import { generateText } from "ai"

// GET - جلب آخر تقرير أسبوعي
export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("weekly_improvement_reports")
    .select("*")
    .order("report_date", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 })
  }

  return NextResponse.json({ report: data || null })
}

// POST - توليد تقرير أسبوعي جديد
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    // جمع إحصائيات الأسبوع الماضي
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    // عدد المستخدمين النشطين
    const { count: activeUsers } = await supabase
      .from("messages")
      .select("sender_id", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString())

    // عدد الرسائل
    const { count: totalMessages } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString())

    // عدد الخلايا النشطة
    const { count: activeGroups } = await supabase
      .from("groups")
      .select("*", { count: "exact", head: true })
      .gte("last_activity_date", weekAgo.toISOString())

    // عدد القرارات الجديدة
    const { count: newDecisions } = await supabase
      .from("decisions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString())

    // عدد طلبات الانضمام
    const { count: joinRequests } = await supabase
      .from("group_join_requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString())

    // مشاكل المحتوى (من moderation_logs)
    const { count: moderationIssues } = await supabase
      .from("moderation_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString())

    const weekStats = {
      active_users: activeUsers || 0,
      total_messages: totalMessages || 0,
      active_groups: activeGroups || 0,
      new_decisions: newDecisions || 0,
      join_requests: joinRequests || 0,
      moderation_issues: moderationIssues || 0,
    }

    // استخدام AI لتحليل البيانات واقتراح تحسينات
    const model = getAIModel()

    const { text } = await generateText({
      model,
      prompt: `أنت محلل نظام ذكي لتطبيق Synaptic Space. قم بتحليل البيانات التالية واقترح تحسينات:

إحصائيات الأسبوع الماضي:
- مستخدمون نشطون: ${weekStats.active_users}
- رسائل مرسلة: ${weekStats.total_messages}
- خلايا نشطة: ${weekStats.active_groups}
- قرارات جديدة: ${weekStats.new_decisions}
- طلبات انضمام: ${weekStats.join_requests}
- مشاكل محتوى: ${weekStats.moderation_issues}

قدم تحليلك بصيغة JSON فقط بهذا الشكل:
{
  "insights": [
    {"type": "warning|info|success", "message": "...", "priority": 1-5}
  ],
  "recommendations": [
    {"title": "...", "description": "...", "impact": "high|medium|low", "effort": 1-5}
  ]
}

تحليلك يجب أن يكون باللغة العربية وواقعي بناء على الأرقام.`,
    })

    let analysis
    try {
      // استخراج JSON من النص
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      analysis = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : {
            insights: [{ type: "info", message: "لا توجد بيانات كافية للتحليل", priority: 1 }],
            recommendations: [],
          }
    } catch {
      analysis = {
        insights: [{ type: "info", message: "تم جمع البيانات بنجاح", priority: 1 }],
        recommendations: [],
      }
    }

    // التحقق من الميزات الجديدة
    const { data: features } = await supabase
      .from("feature_registry")
      .select("feature_key, feature_name_ar, added_date")
      .gte("added_date", weekAgo.toISOString())

    const newFeatures =
      features?.map((f) => ({
        feature_key: f.feature_key,
        name: f.feature_name_ar,
        discovered_at: f.added_date,
        status: "pending",
      })) || []

    // حفظ التقرير
    const { data: report, error: insertError } = await supabase
      .from("weekly_improvement_reports")
      .insert({
        report_date: new Date().toISOString().split("T")[0],
        week_stats: weekStats,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        new_features: newFeatures,
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error("[Weekly Insights] Error:", error)
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 })
  }
}
