import { generateText, streamText } from "ai"

const XAI_API_URL = "https://api.x.ai/v1/chat/completions"

function getApiKey(): string {
  const apiKey = process.env.XAI_API_KEY || ""
  // تنظيف المفتاح من أي أحرف غير مرئية
  return apiKey.replace(/[\r\n\t\s]/g, "")
}

export async function generateAIText(prompt: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: "xai/grok-2-1212",
      prompt: prompt,
      maxTokens: 2000,
    })
    return text
  } catch (error) {
    console.error("AI Error:", error)
    throw new Error("حدث خطأ في خدمة الذكاء الاصطناعي")
  }
}

export async function generateAIStream(prompt: string): Promise<ReadableStream> {
  const result = streamText({
    model: "xai/grok-2-1212",
    prompt: prompt,
    maxTokens: 2000,
  })

  return result.toDataStream()
}
