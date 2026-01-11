import { createGroq } from "@ai-sdk/groq"
import { generateText, streamText } from "ai"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export function getAIModel() {
  return groq("qwen/qwen3-32b")
}

export async function generateAIText(
  prompt: string,
  options?: {
    maxTokens?: number
    temperature?: number
  },
): Promise<string> {
  try {
    const { text } = await generateText({
      model: getAIModel(),
      prompt: prompt,
      maxTokens: options?.maxTokens || 2000,
      temperature: options?.temperature || 0.7,
    })
    return text
  } catch (error) {
    console.error("[v0] AI Error:", error)
    throw new Error("حدث خطأ في خدمة الذكاء الاصطناعي")
  }
}

export async function generateAIStream(
  prompt: string,
  options?: {
    maxTokens?: number
    temperature?: number
  },
): Promise<ReadableStream> {
  try {
    const result = streamText({
      model: getAIModel(),
      prompt: prompt,
      maxTokens: options?.maxTokens || 2000,
      temperature: options?.temperature || 0.7,
    })

    return result.toDataStream()
  } catch (error) {
    console.error("[v0] AI Stream Error:", error)
    throw new Error("حدث خطأ في خدمة الذكاء الاصطناعي")
  }
}

export async function analyzeText(text: string, analysisType: "sentiment" | "topics" | "keywords"): Promise<any> {
  const prompts = {
    sentiment: `حلل المشاعر في النص التالي وأرجع: إيجابي/سلبي/محايد مع نسبة:\n\n${text}`,
    topics: `استخرج المواضيع الرئيسية (3-5 مواضيع) من النص التالي:\n\n${text}`,
    keywords: `استخرج الكلمات المفتاحية (5-10 كلمات) من النص التالي:\n\n${text}`,
  }

  const result = await generateAIText(prompts[analysisType])
  return result
}

export async function classifyMessage(content: string): Promise<{
  type: "question" | "decision" | "idea" | "discussion" | "other"
  confidence: number
}> {
  const prompt = `صنف هذه الرسالة إلى أحد الأنواع التالية: سؤال (question)، قرار (decision)، فكرة (idea)، نقاش (discussion)، أخرى (other).
  
الرسالة: "${content}"

أرجع الإجابة بصيغة JSON: {"type": "...", "confidence": 0.95}`

  try {
    const text = await generateAIText(prompt, { maxTokens: 100, temperature: 0.3 })
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error("Classification error:", e)
  }

  return { type: "other", confidence: 0.5 }
}

export async function extractActionItems(messages: string): Promise<string[]> {
  const prompt = `استخرج المهام والإجراءات المطلوبة من المحادثة التالية (أرجع قائمة JSON فقط):\n\n${messages}`

  try {
    const text = await generateAIText(prompt, { maxTokens: 500 })
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error("Extract action items error:", e)
  }

  return []
}
