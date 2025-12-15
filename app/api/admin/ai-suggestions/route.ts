import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { generateText } from "ai"

async function verifyAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value
  if (!token) return null

  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString())
    if (decoded.exp < Date.now()) return null
    return decoded
  } catch {
    return null
  }
}

export async function GET() {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    // Fetch comprehensive stats
    const [
      { count: usersCount },
      { count: groupsCount },
      { count: messagesCount },
      { data: messagesByLayer },
      { data: features },
      { data: recentActivity },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("groups").select("*", { count: "exact", head: true }),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("messages").select("layer"),
      supabase.from("feature_flags").select("feature_key, is_enabled, feature_name_ar"),
      supabase.from("messages").select("created_at").order("created_at", { ascending: false }).limit(100),
    ])

    const layerCounts = { social: 0, coordination: 0, knowledge: 0 }
    messagesByLayer?.forEach((m) => {
      if (m.layer && layerCounts[m.layer as keyof typeof layerCounts] !== undefined) {
        layerCounts[m.layer as keyof typeof layerCounts]++
      }
    })

    const disabledFeatures = features?.filter((f) => !f.is_enabled).map((f) => f.feature_name_ar) || []

    const prompt = `أنت محلل بيانات لتطبيق Synaptic Space. بناءً على البيانات التالية، قدم 4-6 اقتراحات لتحسين التطبيق:

الإحصائيات:
- المستخدمين: ${usersCount}
- الخلايا: ${groupsCount}
- الرسائل: ${messagesCount}
- توزيع الطبقات: اجتماعية ${layerCounts.social}، تنسيقية ${layerCounts.coordination}، معرفية ${layerCounts.knowledge}
- ميزات معطلة: ${disabledFeatures.join("، ") || "لا يوجد"}

أرجع JSON بالشكل التالي فقط:
{
  "suggestions": [
    {
      "title": "عنوان الاقتراح",
      "description": "وصف مختصر للاقتراح",
      "priority": "high|medium|low",
      "category": "التصنيف"
    }
  ]
}`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt,
    })

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0])
      return NextResponse.json(data)
    }

    return NextResponse.json({ suggestions: [] })
  } catch (error) {
    console.error("AI Suggestions error:", error)
    return NextResponse.json({ error: "فشل في توليد الاقتراحات" }, { status: 500 })
  }
}
