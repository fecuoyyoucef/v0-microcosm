import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import Grok from "groq-sdk"

const grok = new Grok({
  apiKey: process.env.XAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_owner").eq("id", user.id).single()

    if (!profile?.is_owner) {
      return NextResponse.json({ error: "Forbidden - Owner only" }, { status: 403 })
    }

    const { message } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    console.log("[v0] Chief Agent chat - User message:", message)

    // الحصول على إحصائيات النظام الحالية
    const { data: stats } = await supabase.rpc("get_chief_agent_stats").single()
    const { data: recentActions } = await supabase
      .from("agent_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)

    console.log("[v0] Stats fetched:", stats)

    try {
      const completion = await grok.chat.completions.create({
        model: "grok-beta",
        messages: [
          {
            role: "system",
            content: `أنت الوكيل الرئيسي (Chief AI Agent) لتطبيق Synaptic Space.
أنت نائب المالك ولديك صلاحيات كاملة لإدارة المنصة.

دورك:
- الإجابة على أسئلة المالك عن حالة النظام
- تنفيذ التعليمات التي يعطيك إياها
- تقديم تقارير وتحليلات
- اقتراح تحسينات

المعلومات الحالية:
- إحصائيات: ${JSON.stringify(stats || {})}
- آخر الإجراءات: ${JSON.stringify(recentActions || [])}

تحدث بالعربية دائماً، كن محترفاً ومباشراً.`,
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })

      const response = completion.choices[0]?.message?.content || "عذراً، لم أتمكن من الرد."

      console.log("[v0] Grok response:", response)

      await supabase.from("agent_chat_logs").insert([
        {
          user_id: user.id,
          message: message,
          sender: "owner",
        },
        {
          user_id: user.id,
          message: response,
          sender: "agent",
        },
      ])

      return NextResponse.json({ success: true, response })
    } catch (grokError: any) {
      console.error("[v0] Grok API error:", grokError)
      return NextResponse.json(
        {
          success: false,
          error: "فشل الاتصال بالوكيل الذكي",
          response: "عذراً، أواجه صعوبة في الاتصال حالياً. يرجى المحاولة مرة أخرى.",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Chief Agent chat error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to chat with agent",
        response: "عذراً، حدث خطأ غير متوقع.",
      },
      { status: 500 },
    )
  }
}
