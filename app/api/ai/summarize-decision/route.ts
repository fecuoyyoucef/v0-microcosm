import { generateAIText } from "@/lib/ai"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const description = typeof body?.description === "string" ? body.description.trim() : ""

    if (!description) {
      return Response.json({ error: "الوصف مطلوب" }, { status: 400 })
    }

    // منع إرسال نصوص ضخمة إلى المزوّد وحماية حدود السياق
    const boundedDescription = description.slice(0, 12000)
    const text = await generateAIText(
      `لخص هذه الفكرة في عنوان قصير (5-10 كلمات). أعد العنوان فقط دون علامات اقتباس:\n\n${boundedDescription}`,
      { maxTokens: 80, temperature: 0.4 },
    )

    return Response.json({ summary: text.trim() })
  } catch (error) {
    console.error("[v0] Summarize decision error:", error)
    const isRateLimit = error instanceof Error && error.message === "RATE_LIMIT"
    return Response.json(
      { error: isRateLimit ? "الخدمة مشغولة حالياً، حاول بعد لحظات" : "فشل في إنشاء الملخص، يمكنك كتابة العنوان يدوياً" },
      { status: isRateLimit ? 429 : 503 },
    )
  }
}
