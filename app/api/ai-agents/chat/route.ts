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

    // التحقق من أن المستخدم هو المالك
    const { data: adminData } = await supabase.from("admins").select("role").eq("email", user.email).single()

    if (!adminData || adminData.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden - Owner only" }, { status: 403 })
    }

    const { message } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // الحصول على إحصائيات النظام الحالية
    const { data: stats } = await supabase.rpc("get_chief_agent_stats")
    const { data: recentActions } = await supabase
      .from("agent_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)

    // التحدث مع الوكيل الرئيسي عبر Grok
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
- إحصائيات: ${JSON.stringify(stats)}
- آخر الإجراءات: ${JSON.stringify(recentActions)}

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

    // حفظ المحادثة
    await supabase.from("agent_chat_logs").insert({
      user_id: user.id,
      message: message,
      response: response,
    })

    return NextResponse.json({ success: true, response })
  } catch (error) {
    console.error("Chief Agent chat error:", error)
    return NextResponse.json({ error: "Failed to chat with agent" }, { status: 500 })
  }
}
