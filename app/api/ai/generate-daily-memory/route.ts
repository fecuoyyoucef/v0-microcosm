import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"

export async function POST(request: Request) {
  try {
    const { groupId } = await request.json()
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: "غير مصرح" }, { status: 401 })
    }

    // جلب رسائل آخر 24 ساعة
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: messages } = await supabase
      .from("messages")
      .select("content, sender_id, layer")
      .eq("group_id", groupId)
      .gte("created_at", yesterday)
      .order("created_at", { ascending: true })

    if (!messages || messages.length === 0) {
      return Response.json({ error: "لا توجد رسائل لتلخيصها" }, { status: 400 })
    }

    // جلب أسماء المرسلين
    const senderIds = [...new Set(messages.map((m) => m.sender_id))]
    const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", senderIds)
    const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || [])

    const messagesText = messages.map((m) => `[${profileMap.get(m.sender_id) || "مستخدم"}]: ${m.content}`).join("\n")

    console.log("[v0] Generating AI summary for", messages.length, "messages")

    const text =
      await generateAIText(`لخص المحادثة التالية وأبرز النقاط المهمة والقرارات. أرجع الإجابة بصيغة JSON بالشكل التالي:
{
  "summary": "ملخص المحادثة",
  "highlights": ["نقطة 1", "نقطة 2"],
  "topics": ["موضوع 1", "موضوع 2"],
  "decisions": ["قرار 1"]
}

المحادثة:
${messagesText}`)

    console.log("[v0] AI Response:", text)

    let parsed = {
      summary: text,
      highlights: [] as string[],
      topics: [] as string[],
      decisions: [] as string[],
    }

    try {
      // استخراج JSON من النص
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.log("[v0] Could not parse JSON, using raw text")
    }

    // حفظ الملخص
    const today = new Date().toISOString().split("T")[0]
    const { data: memory, error: saveError } = await supabase
      .from("collective_memory")
      .upsert(
        {
          group_id: groupId,
          summary_date: today,
          summary: parsed.summary,
          highlights: parsed.highlights,
          topics: parsed.topics,
          decisions: parsed.decisions,
          message_count: messages.length,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "group_id,summary_date" },
      )
      .select()
      .single()

    if (saveError) {
      console.log("[v0] Save error:", saveError)
      return Response.json({ error: "فشل في حفظ الملخص", details: saveError.message }, { status: 500 })
    }

    console.log("[v0] Memory saved:", memory)

    return Response.json({ success: true, memory })
  } catch (error) {
    console.error("[v0] Generate memory error:", error)
    return Response.json({ error: error instanceof Error ? error.message : "فشل في إنشاء الملخص" }, { status: 500 })
  }
}
