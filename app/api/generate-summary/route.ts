import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"

export async function POST(req: Request) {
  try {
    const { groupId, date } = await req.json()
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: "غير مصرح" }, { status: 401 })
    }

    // التحقق من العضوية
    const { data: membership } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return Response.json({ error: "غير مصرح" }, { status: 403 })
    }

    // جلب رسائل اليوم المحدد
    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    const { data: messages } = await supabase
      .from("messages")
      .select("content, sender_id")
      .eq("group_id", groupId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true })

    if (!messages || messages.length === 0) {
      return Response.json({ error: "لا توجد رسائل في هذا اليوم" }, { status: 400 })
    }

    // جلب أسماء المرسلين
    const senderIds = [...new Set(messages.map((m) => m.sender_id))]
    const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", senderIds)
    const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || [])

    const messagesText = messages.map((m) => `[${profileMap.get(m.sender_id) || "مستخدم"}]: ${m.content}`).join("\n")

    const text = await generateAIText(
      `حلل المحادثة واستخرج: القرارات، الأفكار الرئيسية، المواضيع، والنقاط المعلقة:\n\n${messagesText}`,
    )

    // حفظ الملخص
    await supabase.from("daily_summaries").upsert(
      {
        group_id: groupId,
        summary_date: date,
        summary_text: text,
        raw_message_count: messages.length,
      },
      { onConflict: "group_id,summary_date" },
    )

    return Response.json({ success: true, summary: text })
  } catch (error) {
    console.error("Generate summary error:", error)
    return Response.json({ error: "حدث خطأ في إنشاء الملخص" }, { status: 500 })
  }
}
