import { generateAIText } from "@/lib/ai"

export async function POST(request: Request) {
  try {
    const { description } = await request.json()

    if (!description) {
      return Response.json({ error: "الوصف مطلوب" }, { status: 400 })
    }

    const text = await generateAIText(`لخص هذه الفكرة في عنوان قصير (5-10 كلمات):\n\n${description}`)

    return Response.json({ summary: text.trim() })
  } catch (error) {
    console.error("Summarize error:", error)
    return Response.json({ error: "فشل في إنشاء الملخص" }, { status: 500 })
  }
}
