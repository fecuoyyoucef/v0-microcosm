import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { generateAIChat } from "@/lib/ai"

// GET - جلب الاقتراحات الأسبوعية
export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const limit = Number.parseInt(searchParams.get("limit") || "10")

  try {
    const { data: suggestions, error } = await supabase
      .from("weekly_suggestions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ suggestions: suggestions || [] })
  } catch (error) {
    console.error("Suggestions fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 })
  }
}

// POST - توليد اقتراحات جديدة
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    // تحديد نطاق الأسبوع الماضي
    const weekEnd = new Date()
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

    // جمع الإحصائيات
    const [usersResult, messagesResult, groupsResult, errorsResult] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact" }),
      supabase
        .from("messages")
        .select("id", { count: "exact" })
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString()),
      supabase.from("groups").select("id", { count: "exact" }),
      supabase.from("sentry_errors").select("id", { count: "exact" }).gte("timestamp", weekStart.toISOString()),
    ])

    // جمع إحصائيات استخدام الميزات
    const { data: featureUsage } = await supabase
      .from("feature_usage_logs")
      .select("feature_key, action")
      .gte("created_at", weekStart.toISOString())

    // تحليل الميزات
    const usageMap = new Map<string, { count: number; errors: number }>()
    featureUsage?.forEach((log) => {
      const current = usageMap.get(log.feature_key) || { count: 0, errors: 0 }
      current.count++
      if (log.action === "error") current.errors++
      usageMap.set(log.feature_key, current)
    })

    const unusedFeatures: string[] = []
    const popularFeatures: Array<{ key: string; count: number }> = []

    const { data: allFeatures } = await supabase.from("feature_flags").select("*").eq("is_enabled", true)

    allFeatures?.forEach((feature) => {
      const usage = usageMap.get(feature.feature_key)
      if (!usage || usage.count === 0) {
        unusedFeatures.push(feature.feature_key)
      } else if (usage.count > 50) {
        popularFeatures.push({ key: feature.feature_key, count: usage.count })
      }
    })

    // توليد اقتراحات بالذكاء الاصطناعي
    const text = await generateAIChat({
      prompt: `أنت مساعد ذكي لمالك تطبيق Synaptic Space. قم بتحليل البيانات التالية وقدم 5-7 اقتراحات ملموسة للتحسين.

البيانات الأسبوعية:
- عدد المستخدمين: ${usersResult.count}
- عدد الرسائل هذا الأسبوع: ${messagesResult.count}
- عدد الخلايا: ${groupsResult.count}
- عدد الأخطاء: ${errorsResult.count}
- ميزات غير مستخدمة: ${unusedFeatures.join(", ")}
- الميزات الأكثر استخداماً: ${popularFeatures.map((f) => f.key).join(", ")}

قدم اقتراحات في صيغة JSON فقط:
[
  {
    "type": "improvement|bug|feature|optimization",
    "title": "عنوان قصير",
    "description": "وصف مفصل",
    "priority": "high|medium|low",
    "category": "performance|ux|features|security",
    "estimated_impact": "وصف الأثر المتوقع"
  }
]`,
    })

    let suggestions = []
    try {
      suggestions = JSON.parse(text)
    } catch {
      suggestions = [
        {
          type: "improvement",
          title: "مراجعة عامة",
          description: text,
          priority: "medium",
          category: "general",
        },
      ]
    }

    // حفظ في قاعدة البيانات
    const { data: newSuggestion, error } = await supabase
      .from("weekly_suggestions")
      .insert({
        week_start_date: weekStart.toISOString().split("T")[0],
        week_end_date: weekEnd.toISOString().split("T")[0],
        total_users: usersResult.count || 0,
        total_messages: messagesResult.count || 0,
        total_groups: groupsResult.count || 0,
        error_count: errorsResult.count || 0,
        suggestions,
        unused_features: unusedFeatures,
        popular_features: popularFeatures,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, suggestion: newSuggestion })
  } catch (error) {
    console.error("Suggestion generation error:", error)
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}

// PATCH - اتخاذ قرار على اقتراح
export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    const { suggestion_id, suggestion_index, decision, reason } = await request.json()

    const { error } = await supabase.from("suggestion_decisions").insert({
      suggestion_id,
      suggestion_index,
      decision,
      reason,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Decision save error:", error)
    return NextResponse.json({ error: "Failed to save decision" }, { status: 500 })
  }
}
