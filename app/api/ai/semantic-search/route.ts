import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"

export async function POST(req: Request) {
  try {
    const { query, groupId, limit = 20 } = await req.json()
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: "غير مصرح" }, { status: 401 })
    }

    // جلب جميع الرسائل (في الإنتاج: استخدم vector embeddings)
    const { data: messages } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        created_at,
        sender:profiles!sender_id(display_name),
        node:conversation_nodes(title)
      `)
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(200)

    if (!messages) {
      return Response.json({ results: [] })
    }

    // استخدام AI لتحديد الرسائل ذات الصلة
    const messagesContext = messages.map((m, i) => `[${i}] ${m.content}`).join("\n")

    const prompt = `من الرسائل التالية، حدد الرسائل الأكثر صلة بالاستعلام: "${query}"

الرسائل:
${messagesContext}

أرجع أرقام الرسائل ذات الصلة فقط كقائمة JSON: [0, 5, 12, ...]`

    const text = await generateAIText(prompt, { maxTokens: 300, temperature: 0.3 })
    const jsonMatch = text.match(/\[[\s\S]*\]/)

    let relevantIndices: number[] = []
    if (jsonMatch) {
      relevantIndices = JSON.parse(jsonMatch[0])
    }

    const results = relevantIndices
      .slice(0, limit)
      .map((i) => messages[i])
      .filter(Boolean)

    return Response.json({ success: true, results })
  } catch (error) {
    console.error("Semantic search error:", error)
    return Response.json({ error: "حدث خطأ" }, { status: 500 })
  }
}
