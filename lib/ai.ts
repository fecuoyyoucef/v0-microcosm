import { generateText, streamText } from "ai"

export async function generateAIText(prompt: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: "xai/grok-2-1212",
      prompt: prompt,
      maxTokens: 2000,
      temperature: 0.7,
    })
    return text
  } catch (error) {
    console.error("[v0] AI Error:", error)
    throw new Error("حدث خطأ في خدمة الذكاء الاصطناعي")
  }
}

export async function generateAIStream(prompt: string): Promise<ReadableStream> {
  try {
    const result = streamText({
      model: "xai/grok-2-1212",
      prompt: prompt,
      maxTokens: 2000,
      temperature: 0.7,
    })

    return result.toDataStream()
  } catch (error) {
    console.error("[v0] AI Stream Error:", error)
    throw new Error("حدث خطأ في خدمة الذكاء الاصطناعي")
  }
}
