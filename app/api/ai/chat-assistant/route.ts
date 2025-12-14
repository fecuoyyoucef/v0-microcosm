import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"

export async function POST(req: Request) {
  try {
    const { messages, userId } = await req.json()

    console.log("[v0] Chat assistant request:", { messagesCount: messages?.length, userId })

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "رسائل غير صالحة" }, { status: 400 })
    }

    const supabase = await createClient()

    // التحقق من المستخدم
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] No authenticated user")
      return Response.json({ error: "غير مصرح" }, { status: 401 })
    }

    // جلب معلومات المستخدم للسياق
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single()

    // جلب آخر القرارات والعقد للسياق
    const { data: recentDecisions } = await supabase
      .from("decisions")
      .select("title, description")
      .order("created_at", { ascending: false })
      .limit(5)

    const { data: recentNodes } = await supabase
      .from("conversation_nodes")
      .select("title")
      .order("created_at", { ascending: false })
      .limit(5)

    // بناء السياق
    const context = `
أنت مساعد ذكي لتطبيق Synaptic Space - منصة محادثات ذكية.
المستخدم: ${profile?.display_name || "مستخدم"}

آخر القرارات في المجموعات:
${recentDecisions?.map((d) => `- ${d.title}: ${d.description}`).join("\n") || "لا توجد قرارات"}

آخر العقد (المواضيع):
${recentNodes?.map((n) => `- ${n.title}`).join("\n") || "لا توجد عقد"}

تعليمات:
- أجب باللغة العربية بشكل واضح ومفيد
- كن مختصراً ومباشراً
- إذا سألوك عن إحصائيات لا تملكها، اعتذر بلطف
- ساعد في تلخيص المحادثات، اقتراح أفكار، والإجابة على الأسئلة
`.trim()

    // بناء الـ prompt من المحادثة
    const conversationHistory = messages
      .map((msg: any) => `${msg.role === "user" ? "المستخدم" : "المساعد"}: ${msg.content}`)
      .join("\n")

    const fullPrompt = `${context}\n\nالمحادثة:\n${conversationHistory}\n\nالمساعد:`

    console.log("[v0] Generating AI response...")
    const response = await generateAIText(fullPrompt)
    console.log("[v0] AI response generated successfully")

    return Response.json({ success: true, response })
  } catch (error) {
    console.error("[v0] Chat assistant error:", error)
    return Response.json(
      {
        error: "حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
