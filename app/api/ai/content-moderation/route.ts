import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"

export async function POST(req: Request) {
  try {
    const { content, groupId } = await req.json()
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: "غير مصرح" }, { status: 401 })
    }

    const prompt = `حلل هذا النص وحدد إذا كان يحتوي على:
- محتوى مسيء أو عنيف
- لغة نابية
- خطاب كراهية
- محتوى غير لائق

النص: "${content}"

أرجع JSON: {"is_safe": true/false, "reason": "السبب", "severity": 0-10}`

    const text = await generateAIText(prompt, { maxTokens: 200, temperature: 0.2 })
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    let result = { is_safe: true, reason: "", severity: 0 }
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0])
    }

    // حفظ النتيجة في السجلات
    if (!result.is_safe && result.severity > 5) {
      await supabase.from("moderation_logs").insert({
        user_id: user.id,
        group_id: groupId,
        content: content,
        reason: result.reason,
        severity: result.severity,
      })
    }

    return Response.json({ success: true, ...result })
  } catch (error) {
    console.error("Moderation error:", error)
    return Response.json({ error: "حدث خطأ" }, { status: 500 })
  }
}
