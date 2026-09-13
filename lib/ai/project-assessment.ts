import { generateText, Output } from "ai"
import { z } from "zod"

const assessmentSchema = z.object({
  responsibilityScore: z.number().min(0).max(100),
  progressScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  responsibilitySummary: z.string(),
  progressSummary: z.string(),
  evidence: z.array(z.object({
    messageIndex: z.number().int().nonnegative(),
    type: z.enum(["commitment", "delivery", "follow_up", "respect", "harm", "blocker", "decision"]),
    note: z.string(),
  })).max(12),
  behavior: z.object({
    respect: z.number().min(0).max(100),
    reliability: z.number().min(0).max(100),
    followThrough: z.number().min(0).max(100),
    harmfulConduct: z.number().min(0).max(100),
  }),
})

export type ProjectAssessment = z.infer<typeof assessmentSchema>

export async function assessProjectConversation(input: {
  groupName: string
  goal?: string | null
  messages: Array<{ id: string; author: string; content: string; createdAt: string }>
}) {
  const transcript = input.messages.map((message, index) => `[${index}] ${message.author} (${message.createdAt}): ${message.content}`).join("\n")

  const result = await generateText({
    model: "openai/gpt-6-astra-fast",
    output: Output.object({ schema: assessmentSchema }),
    temperature: 0.1,
    system: `أنت مقيّم محايد لمشاريع ومجتمعات عربية. قيّم الأدلة الظاهرة في الرسائل فقط، ولا تستنتج النوايا أو الصفات الشخصية.

معيار المسؤولية الحقيقي:
- الالتزام بما تعهد به الشخص ثم المتابعة والإنجاز أو التوضيح عند التعثر.
- احترام الآخرين، عدم الإساءة أو الإهانة أو التهديد أو التحرش.
- جودة التعاون، الاستماع، حل الخلافات، وتحمل المسؤولية.
لا ترفع الدرجة لمجرد كثرة الرسائل، ولا تخفضها بسبب الصمت إذا لم توجد مسؤولية مطلوبة.

معيار التقدم:
- قيّم ما تحقق فعلياً في المشروع من الرسائل: مخرجات ملموسة، تجارب، قرارات منفذة، تسليمات، إزالة عوائق، وخطوات تالية واضحة.
- لا تعتبر الإقرار أو الوعد أو العقد إنجازاً ما لم توجد قرائن على التنفيذ.
- قيّم التقدم مقارنة بهدف المشروع، مع خفض الثقة عندما تكون الأدلة قليلة أو غامضة.
- لا تجعل الدرجة حكماً تأديبياً آلياً؛ سجّل الأدلة والشكوك بوضوح.

أعد JSON مطابقاً للمخطط. messageIndex يجب أن يشير إلى الرسائل التي تبرر الاستنتاج. harmfulConduct هو مقدار السلوك الضار المرصود، حيث 0 يعني لا دليل و100 يعني سلوك ضار متكرر وواضح.`,
    prompt: `المشروع: ${input.groupName}\nالهدف: ${input.goal || "غير محدد"}\n\nالرسائل:\n${transcript}`,
  })

  return result.output
}

export { assessmentSchema }
