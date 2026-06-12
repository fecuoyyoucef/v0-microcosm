import { createGroq } from "@ai-sdk/groq"
import { createXai } from "@ai-sdk/xai"
import { generateText, streamText, stepCountIs, type LanguageModel, type ModelMessage, type ToolSet } from "ai"

/**
 * طبقة موحّدة للذكاء الاصطناعي مع تسلسل بديل تلقائي (Fallback Chain).
 *
 * الترتيب: Groq (مجاني) → Grok / xAI → Vercel AI Gateway.
 *
 * - نبدأ دائماً بـ Groq المجاني لتقليل التكلفة.
 * - عند تجاوز حدّ المعدّل (429) أو فشل المزوّد، ننتقل تلقائياً للمزوّد التالي.
 * - كل مزوّد يُعاد عليه المحاولة مع تأخير متصاعد قبل الانتقال للذي يليه.
 *
 * ملاحظة مهمة: المشروع يستخدم AI SDK v5، والمعامل الصحيح لحدّ الإخراج هو
 * `maxOutputTokens` وليس `maxTokens`. استخدام الاسم الخاطئ كان يجعل النموذج
 * يولّد بلا حدّ ويستنزف حدّ التوكنز في الطبقة المجانية → 429 متكرر.
 */

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
})

/**
 * هل مفتاح Grok / xAI متاح؟ (الطبقة البديلة الثانية)
 */
function hasXai(): boolean {
  return Boolean(process.env.XAI_API_KEY)
}

/**
 * هل بوابة Vercel AI Gateway متاحة؟
 * على Vercel تعمل بدون مفتاح لمزوّدين مدعومين؛ خارجها تحتاج AI_GATEWAY_API_KEY.
 */
function hasGateway(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL)
}

/**
 * تسلسل النماذج للمهام النصية العامة (تصنيف، ترجمة، تلخيص...).
 * استبدلنا نموذج التفكير qwen3-32b بنموذج أسرع غير تفكيري لتقليل
 * استهلاك التوكنز وتفادي الردّ الفارغ المليء بوسوم <think>.
 */
function getTextModelChain(): LanguageModel[] {
  const chain: LanguageModel[] = [groq("llama-3.3-70b-versatile")]
  if (hasXai()) chain.push(xai("grok-4"))
  if (hasGateway()) chain.push("groq/llama-3.3-70b-versatile")
  return chain
}

/**
 * تسلسل النماذج لاستدعاء الأدوات (function calling).
 *
 * نبدأ بـ Grok / xAI عندما يكون متاحاً لأنه أقوى بوضوح في فهم القصد العربي
 * واختيار الأداة الصحيحة وتسلسل الخطوات — وهي نقطة ضعف Llama التي كانت
 * تجعل المساعد يتصرف ببدائية (يختار searchMessages دائماً ويمرّر الجملة كاملة).
 * نُبقي Llama المجاني كطبقة احتياطية عند فشل Grok أو تجاوز حدّه.
 */
function getToolModelChain(): LanguageModel[] {
  const chain: LanguageModel[] = []
  if (hasXai()) chain.push(xai("grok-4"))
  chain.push(groq("llama-3.3-70b-versatile"))
  if (hasGateway()) chain.push("groq/llama-3.3-70b-versatile")
  return chain
}

/**
 * النموذج الأساسي (يُحتفظ به للتوافق مع الكود القديم).
 */
export function getAIModel() {
  return groq("llama-3.3-70b-versatile")
}

export function getAIToolModel() {
  return groq("llama-3.3-70b-versatile")
}

/**
 * هل الخطأ ناتج عن تجاوز حدّ المعدّل (rate limit / TPM)؟
 */
function isRateLimitError(error: unknown): boolean {
  const e = error as any
  const status = e?.statusCode ?? e?.status ?? e?.response?.status
  if (status === 429) return true
  const msg = String(e?.message || e || "").toLowerCase()
  return (
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("too many requests") ||
    msg.includes("429")
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * منفّذ عام يجرّب كل نموذج في التسلسل بالترتيب.
 * - لكل نموذج: إعادة محاولة مع تأخير متصاعد عند 429.
 * - عند فشل النموذج نهائياً ننتقل للنموذج التالي في التسلسل.
 * - إذا فشل الجميع نرمي الخطأ المناسب.
 */
async function runWithFallback<T>(
  chain: LanguageModel[],
  run: (model: LanguageModel) => Promise<T>,
  opts: { retriesPerModel?: number } = {},
): Promise<T> {
  const retriesPerModel = opts.retriesPerModel ?? 2
  let lastError: unknown
  let sawRateLimit = false

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i]
    for (let attempt = 0; attempt <= retriesPerModel; attempt++) {
      try {
        return await run(model)
      } catch (error) {
        lastError = error
        if (isRateLimitError(error)) {
          sawRateLimit = true
          if (attempt < retriesPerModel) {
            const delay = 1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 400)
            console.log(
              `[v0] Provider ${i + 1}/${chain.length} rate limited, retry ${attempt + 1}/${retriesPerModel} in ${delay}ms`,
            )
            await sleep(delay)
            continue
          }
          // استنفدنا محاولات هذا المزوّد → انتقل للتالي
          console.log(`[v0] Provider ${i + 1}/${chain.length} exhausted, falling back to next provider`)
          break
        }
        // خطأ غير متعلق بالحدّ → جرّب المزوّد التالي مباشرة
        console.error(`[v0] Provider ${i + 1}/${chain.length} error, falling back:`, error)
        break
      }
    }
  }

  if (sawRateLimit) {
    throw new Error("RATE_LIMIT")
  }
  console.error("[v0] All AI providers failed:", lastError)
  throw new Error("حدث خطأ في خدمة الذكاء الاصطناعي")
}

/**
 * توليد نص باستخدام نظام الأدوات متعدد الخطوات، مع تسلسل بديل بين المزوّدين.
 */
export async function generateWithTools(params: {
  system: string
  messages: ModelMessage[]
  tools: ToolSet
  maxSteps?: number
  temperature?: number
}): Promise<string> {
  const { system, messages, tools, maxSteps = 5, temperature = 0.4 } = params
  const chain = getToolModelChain()

  return runWithFallback(chain, async (model) => {
    const result = await generateText({
      model,
      system,
      messages,
      tools,
      stopWhen: stepCountIs(maxSteps),
      temperature,
    })

    let text = cleanThinkingTags(result.text || "")

    // الحالة: انتهت الخطوات والنموذج ما زال ينادي أدوات دون نصّ نهائي.
    if (!text) {
      try {
        const finalize = await generateText({
          model,
          system,
          messages: [
            ...messages,
            ...result.response.messages,
            {
              role: "user",
              content:
                "بناءً على المعلومات التي جمعتها أعلاه، اكتب الآن الإجابة النهائية للمستخدم بالعربية الفصحى فقط، دون استدعاء أي أدوات إضافية.",
            },
          ],
          temperature,
        })
        text = cleanThinkingTags(finalize.text || "")
      } catch (finalizeError) {
        console.error("[v0] AI finalize step error:", finalizeError)
      }
    }

    return text
  })
}

function cleanThinkingTags(text: string): string {
  // Remove all variations: <think>...</think>, <thinking>...</thinking>, etc.
  let cleaned = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "")

  // Remove any other XML-like thinking tags
  cleaned = cleaned.replace(/<[^>]*?think[^>]*?>[\s\S]*?<\/[^>]*?>/gi, "")

  return cleaned.trim()
}

export async function generateAIText(
  prompt: string,
  options?: {
    maxTokens?: number
    temperature?: number
  },
): Promise<string> {
  const chain = getTextModelChain()
  const text = await runWithFallback(chain, async (model) => {
    const { text } = await generateText({
      model,
      prompt,
      maxOutputTokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.7,
    })
    return text
  })
  return cleanThinkingTags(text)
}

/**
 * توليد نص من سجل رسائل (system + messages) عبر تسلسل المزوّدين البديل.
 * تستخدمه المسارات التي كانت تستدعي generateText مباشرة بنموذج واحد،
 * لتحصل تلقائياً على إعادة المحاولة والانتقال للمزوّد التالي عند 429.
 */
export async function generateAIChat(params: {
  system?: string
  prompt?: string
  messages?: ModelMessage[]
  maxTokens?: number
  temperature?: number
}): Promise<string> {
  const { system, prompt, messages, maxTokens = 2000, temperature = 0.7 } = params
  const chain = getTextModelChain()
  const text = await runWithFallback(chain, async (model) => {
    const { text } = await generateText({
      model,
      ...(system ? { system } : {}),
      ...(messages ? { messages } : {}),
      ...(prompt ? { prompt } : {}),
      maxOutputTokens: maxTokens,
      temperature,
    })
    return text
  })
  return cleanThinkingTags(text)
}

export async function generateAIStream(
  prompt: string,
  options?: {
    maxTokens?: number
    temperature?: number
  },
): Promise<ReadableStream> {
  // البثّ يستخدم المزوّد الأساسي مباشرة؛ يتولى استدعاء toDataStream البثّ نفسه.
  const result = streamText({
    model: getAIModel(),
    prompt,
    maxOutputTokens: options?.maxTokens ?? 2000,
    temperature: options?.temperature ?? 0.7,
  })

  return result.toUIMessageStream() as unknown as ReadableStream
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
