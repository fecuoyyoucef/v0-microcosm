import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"

export async function POST(req: Request) {
  try {
    const { groupId, question } = await req.json()
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

    // جلب آخر الرسائل للسياق
    const { data: messages } = await supabase
      .from("messages")
      .select("content, sender:profiles(display_name)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(20)

    const context =
      messages
        ?.reverse()
        .map((m: any) => `${m.sender?.display_name || "مستخدم"}: ${m.content}`)
        .join("\n") || ""

    const prompt = `أنت مساعد ذكي لمجموعة محادثة. السياق:\n${context}\n\nالسؤال: ${question}\n\nأجب باللغة العربية بشكل مختصر.`
    const text = await generateAIText(prompt)

    return Response.json({ success: true, answer: text })
  } catch (error) {
    console.error("Chat assistant error:", error)
    return Response.json({ error: "حدث خطأ" }, { status: 500 })
  }
}
