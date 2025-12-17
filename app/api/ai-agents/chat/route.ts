import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
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

    const { data: agentStatus } = await supabase.from("agent_status").select("*").limit(1).single()

    const { data: recentActions } = await supabase
      .from("agent_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)

    const stats = {
      actions_today: agentStatus?.actions_today || 0,
      accuracy_rate: agentStatus?.accuracy_rate || 100,
      is_active: agentStatus?.is_active ?? true,
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
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

    // حفظ المحادثة
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
  } catch (error: any) {
    console.error("[v0] Chief Agent chat error:", error)

    return NextResponse.json({
      success: false,
      response: `عذراً، حدث خطأ: ${error.message || "خطأ غير معروف"}`,
      error: error.message,
    })
  }
}
