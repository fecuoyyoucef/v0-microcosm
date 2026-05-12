import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"
import { checkFeatureServer } from "@/lib/features-server"

export async function POST(req: Request) {
  try {
    // Check if feature is enabled
    const enabled = await checkFeatureServer("collective_memory")
    if (!enabled) {
      return Response.json({ error: "Feature disabled" }, { status: 403 })
    }

    const { groupId, action, messageIds } = await req.json()
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

    // جلب الرسائل
    let query = supabase.from("messages").select("*").eq("group_id", groupId)
    if (messageIds && messageIds.length > 0) {
      query = query.in("id", messageIds)
    } else {
      query = query.order("created_at", { ascending: false }).limit(50)
    }

    const { data: messages } = await query
    if (!messages || messages.length === 0) {
      return Response.json({ error: "لا توجد رسائل للتحليل" }, { status: 400 })
    }

    // جلب أسماء المرسلين
    const senderIds = [...new Set(messages.map((m) => m.sender_id))]
    const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", senderIds)
    const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || [])

    const messagesText = messages
      .reverse()
      .map((m) => `[${profileMap.get(m.sender_id) || "مستخدم"}]: ${m.content}`)
      .join("\n")

    // تحديد نوع التحليل
    let prompt = ""
    switch (action) {
      case "summarize":
        prompt = `لخص المحادثة التالية بشكل موجز:\n\n${messagesText}`
        break
      case "extract_decisions":
        prompt = `استخرج القرارات والاتفاقات من المحادثة:\n\n${messagesText}`
        break
      case "extract_tasks":
        prompt = `استخرج المهام المطلوبة من المحادثة:\n\n${messagesText}`
        break
      default:
        prompt = `حلل المحادثة التالية:\n\n${messagesText}`
    }

    const text = await generateAIText(prompt)

    return Response.json({ success: true, result: text })
  } catch (error) {
    console.error("AI error:", error)
    return Response.json({ error: "حدث خطأ في التحليل" }, { status: 500 })
  }
}
