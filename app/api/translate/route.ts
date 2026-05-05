import { NextResponse } from "next/server"
import { generateAIText } from "@/lib/ai"

const langNames: Record<string, string> = {
  ar: "Arabic",
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  tr: "Turkish",
  ur: "Urdu",
  fa: "Persian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  pt: "Portuguese",
  it: "Italian",
  hi: "Hindi",
}

export async function POST(request: Request) {
  const { text, targetLang = "en" } = await request.json()

  if (!text) {
    return NextResponse.json({ error: "Text required" }, { status: 400 })
  }

  try {
    const langName = langNames[targetLang] || targetLang
    const translated = await generateAIText(
      `Translate the following text to ${langName}. ONLY return the translated text. Do NOT include any explanation, thinking, or commentary. Just the translation.\n\nText: ${text}`,
      { maxTokens: 1000, temperature: 0.3 },
    )

    return NextResponse.json({ translated: translated.trim(), success: true })
  } catch (error) {
    console.error("[v0] Translation error:", error)
    return NextResponse.json({ error: "Translation failed" }, { status: 500 })
  }
}
