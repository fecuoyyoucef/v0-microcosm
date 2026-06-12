import { NextResponse } from "next/server"
import { generateAIText } from "@/lib/ai"

export async function POST(request: Request) {
  const { text, targetLang = "en" } = await request.json()

  if (!text) {
    return NextResponse.json({ error: "Text required" }, { status: 400 })
  }

  const langNames: Record<string, string> = {
    ar: "Arabic",
    en: "English",
    fr: "French",
    es: "Spanish",
    de: "German",
    tr: "Turkish",
  }
  const targetLangName = langNames[targetLang] || targetLang

  try {
    const raw = await generateAIText(
      `You are a translation engine. Translate the user text to ${targetLangName}.
Rules:
- Output ONLY the translated text.
- Do not add explanations, notes, quotes, prefixes, or any reasoning.
- Do not include any tags like <think> or </think>.
- Preserve emoji and line breaks.

User text:
${text}`,
      { maxTokens: 1000, temperature: 0.3 },
    )

    // Strip any <think>...</think> blocks (some reasoning models leak them)
    let translated = raw.replace(/<think>[\s\S]*?<\/think>/gi, "")
    // Strip stray opening/closing think tags if the close tag was cut off
    translated = translated.replace(/<\/?think>/gi, "")
    // Strip surrounding quotes/whitespace
    translated = translated.trim().replace(/^["“”'`]+|["“”'`]+$/g, "").trim()

    return NextResponse.json({ translated, success: true })
  } catch (error) {
    console.error("[v0] Translation error:", error)
    return NextResponse.json({ error: "Translation failed" }, { status: 500 })
  }
}
