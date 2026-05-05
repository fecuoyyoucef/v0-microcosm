import { generateText } from "ai"
import { NextResponse } from "next/server"
import { getAIModel } from "@/lib/ai"

export async function POST(request: Request) {
  const { text, targetLang = "en" } = await request.json()

  if (!text) {
    return NextResponse.json({ error: "Text required" }, { status: 400 })
  }

  try {
    const { text: translated } = await generateText({
      model: getAIModel(),
      prompt: `Translate the following text to ${targetLang}. Only return the translated text, nothing else.\n\nText: ${text}`,
    })

    return NextResponse.json({ translated, success: true })
  } catch (error) {
    console.error("[v0] Translation error:", error)
    return NextResponse.json({ error: "Translation failed" }, { status: 500 })
  }
}
