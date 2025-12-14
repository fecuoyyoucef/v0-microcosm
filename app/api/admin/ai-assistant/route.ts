import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { getAIModel } from "@/lib/ai"

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { query, context } = await req.json()
    const supabase = await createClient()

    const stats = await getSystemStats(supabase)

    const systemPrompt = `أنت مساعد ذكاء اصطناعي لمالك تطبيق Synaptic Space. دورك مساعدة المالك في:
1. **التحليل والإحصائيات**: تحليل البيانات وتقديم رؤى ذكية
2. **الأتمتة**: اقتراح عمليات تلقائية لتحسين إدارة التطبيق
3. **حل المشاكل**: مساعدة في تشخيص المشاكل التقنية
4. **التوصيات**: اقتراح تحسينات بناء على سلوك المستخدمين

**مهم**: احترم خصوصية المستخدمين ولا تكشف معلومات شخصية محددة. استخدم إحصائيات مجمعة فقط.

**بيانات النظام الحالية:**
- عدد المستخدمين: ${stats.users}
- عدد الخلايا: ${stats.groups}
- عدد الرسائل: ${stats.messages}
- الرسائل الاجتماعية: ${stats.messagesByLayer.social}
- الرسائل التنسيقية: ${stats.messagesByLayer.coordination}
- الرسائل المعرفية: ${stats.messagesByLayer.knowledge}

${context ? `**سياق إضافي**: ${context}` : ""}`

    const { text } = await generateText({
      model: getAIModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      temperature: 0.7,
      maxTokens: 1000,
    })

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("[Admin AI] Error:", error)
    return NextResponse.json({ error: "Failed to process query" }, { status: 500 })
  }
}

async function getSystemStats(supabase: any) {
  const [users, groups, messages, decisions] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("groups").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("decisions").select("id", { count: "exact", head: true }),
  ])

  const { data: messagesByLayer } = await supabase
    .from("messages")
    .select("layer")
    .in("layer", ["social", "coordination", "knowledge"])

  const layerCounts = {
    social: messagesByLayer?.filter((m: any) => m.layer === "social").length || 0,
    coordination: messagesByLayer?.filter((m: any) => m.layer === "coordination").length || 0,
    knowledge: messagesByLayer?.filter((m: any) => m.layer === "knowledge").length || 0,
  }

  return {
    users: users.count || 0,
    groups: groups.count || 0,
    messages: messages.count || 0,
    decisions: decisions.count || 0,
    messagesByLayer: layerCounts,
  }
}
