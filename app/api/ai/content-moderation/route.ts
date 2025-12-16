import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const { content } = await req.json()

    // Extreme keywords only
    const extremeKeywords = ["قتل", "اغتيال", "تفجير", "إرهاب", "bomb", "kill", "murder"]

    const lowerContent = content.toLowerCase()
    let isAppropriate = true
    let reason = ""

    for (const keyword of extremeKeywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        isAppropriate = false
        reason = `المحتوى يحتوي على كلمات خطيرة`
        break
      }
    }

    // Only log if truly dangerous
    if (!isAppropriate) {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await supabase.from("moderation_logs").insert({
          user_id: user.id,
          content: content,
          reason: reason,
          severity: 8,
        })
      }
    }

    return Response.json({
      isAppropriate,
      reason: isAppropriate ? "" : reason,
    })
  } catch (error) {
    console.error("Moderation error:", error)
    return Response.json({ isAppropriate: true, reason: "" })
  }
}
