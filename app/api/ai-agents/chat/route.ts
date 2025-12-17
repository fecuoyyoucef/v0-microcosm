import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Chat API called")

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)

    const { message } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    console.log("[v0] Message received:", message)

    // التحقق من وجود GROQ_API_KEY
    if (!process.env.GROQ_API_KEY) {
      console.error("[v0] GROQ_API_KEY is missing!")
      return NextResponse.json({
        success: false,
        response: "عذراً، مفتاح API الخاص بـ Groq غير مُعرّف. يرجى إضافته في إعدادات المشروع.",
      })
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })

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

    console.log("[v0] Calling Groq API...")

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

    console.log("[v0] Groq API responded successfully")

    const response = completion.choices[0]?.message?.content || "عذراً، لم أتمكن من الرد."

    // حفظ المحادثة
    console.log("[v0] Saving chat to database...")
    const { error: saveError } = await supabase.from("agent_chat_logs").insert([
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

    if (saveError) {
      console.error("[v0] Error saving chat:", saveError)
    } else {
      console.log("[v0] Chat saved successfully")
    }

    return NextResponse.json({ success: true, response })
  } catch (error: any) {
    console.error("[v0] Chief Agent chat error:", error)
    console.error("[v0] Error stack:", error.stack)

    return NextResponse.json(
      {
        success: false,
        response: `عذراً، حدث خطأ: ${error.message || "خطأ غير معروف"}. يرجى المحاولة لاحقاً.`,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
