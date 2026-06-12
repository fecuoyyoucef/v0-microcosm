import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateAIChat } from "@/lib/ai"
import { verifyAdmin } from "@/lib/admin-auth"

export async function POST(request: Request) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  try {
    const { message, history } = await request.json()
    const supabase = await createClient()

    // Fetch app stats for context
    const [
      { count: usersCount },
      { count: groupsCount },
      { count: messagesCount },
      { count: decisionsCount },
      { data: recentUsers },
      { data: features },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("groups").select("*", { count: "exact", head: true }),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("decisions").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("created_at").order("created_at", { ascending: false }).limit(10),
      supabase.from("feature_flags").select("feature_key, is_enabled"),
    ])

    const enabledFeatures = features?.filter((f) => f.is_enabled).length || 0

    const systemPrompt = `أنت مساعد ذكي لمالك تطبيق Synaptic Space. مهمتك تقديم تحليلات ورؤى واقتراحات.

إحصائيات التطبيق الحالية:
- المستخدمين: ${usersCount || 0}
- الخلايا: ${groupsCount || 0}
- الرسائل: ${messagesCount || 0}
- القرارات: ${decisionsCount || 0}
- الميزات المفعلة: ${enabledFeatures}

آخر 10 مستخدمين سجلوا: ${recentUsers?.map((u) => new Date(u.created_at).toLocaleDateString("ar-SA")).join("، ")}

أجب بالعربية بشكل مختصر ومفيد. قدم اقتراحات عملية وتحليلات مبنية على البيانات.`

    const conversationHistory = history
      .map((msg: any) => `${msg.role === "user" ? "المستخدم" : "المساعد"}: ${msg.content}`)
      .join("\n")

    const text = await generateAIChat({
      system: systemPrompt,
      prompt: `${conversationHistory}\n\nالمستخدم: ${message}\n\nالمساعد:`,
      temperature: 0.7,
    })

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("AI Chat error:", error)
    return NextResponse.json({ error: "فشل في التواصل مع AI" }, { status: 500 })
  }
}
