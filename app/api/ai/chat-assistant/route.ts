import { createClient, createServiceClient } from "@/lib/supabase/server"
import { generateWithTools } from "@/lib/ai"
import { buildAssistantTools } from "@/lib/ai/assistant-tools"
import type { ModelMessage } from "ai"

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    console.log("[v0] Chat assistant request:", { messagesCount: messages?.length })

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "رسائل غير صالحة" }, { status: 400 })
    }

    const supabase = await createClient()

    // التحقق من المستخدم — نعتمد على الجلسة فقط، لا على userId من العميل (حماية)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] No authenticated user")
      return Response.json({ error: "غير مصرح" }, { status: 401 })
    }

    const serviceSupabase = createServiceClient()

    // جلب اسم المستخدم وخلاياه مرة واحدة (تُستخدم في نظام الصلاحيات وحل أسماء الخلايا)
    const [{ data: profile }, { data: memberships }] = await Promise.all([
      serviceSupabase.from("profiles").select("display_name, username").eq("id", user.id).single(),
      serviceSupabase
        .from("group_members")
        .select("role, groups (id, name, description, goal, cell_category)")
        .eq("user_id", user.id),
    ])

    const userCells = (memberships || [])
      .map((m: any) => {
        const g = m.groups
        if (!g?.id) return null
        return {
          id: g.id as string,
          name: (g.name as string) || "خلية",
          role: (m.role as string) || "member",
          description: (g.description as string) || null,
          goal: (g.goal as string) || null,
          cell_category: (g.cell_category as string) || null,
        }
      })
      .filter(Boolean) as Array<{
      id: string
      name: string
      role: string
      description: string | null
      goal: string | null
      cell_category: string | null
    }>

    const userName = profile?.display_name || profile?.username || "مستخدم"

    // بناء الأدوات المحصورة بصلاحيات هذا المستخدم
    const tools = buildAssistantTools({
      supabase: serviceSupabase,
      userId: user.id,
      userCells,
    })

    const today = new Date().toLocaleDateString("ar", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

    const system = `أنت المساعد الذكي الشخصي لتطبيق Synaptic Space — منصة محادثات ومناقشات جماعية ذكية تُنظَّم في "خلايا" (مجموعات).

⚠️ تعليمات لغوية حتمية:
- الرد يجب أن يكون بالعربية الفصحى فقط، بلا أي كلمات أجنبية (إنجليزية أو غيرها).
- الاستثناء الوحيد المسموح: اسم التطبيق "Synaptic Space".
- إن احتجت لمصطلح تقني فترجمه للعربية.

# هويتك ودورك
- أنت تتحدث مع: ${userName}.
- التاريخ اليوم: ${today}.
- عدد خلايا المستخدم: ${userCells.length}.
- مهمتك: الإجابة عن أسئلة المستخدم حول نشاطه ورسائله وقراراته ومهامه وخلاياه، وتقديم رؤى وتلخيصات مفيدة.

# كيفية العمل (مهم جداً)
- لديك أدوات تصل لبيانات المستخدم الحقيقية. **استخدم الأدوات دائماً للحصول على البيانات قبل الإجابة** — لا تختلق أي معلومة.
- اختر الأداة المناسبة حسب السؤال: للبحث في الرسائل استخدم searchMessages، للقرارات getDecisions، للمهام getTasks، للملخصات getCellSummaries، وهكذا.
- يمكنك استدعاء أكثر من أداة على التوالي لتجميع إجابة كاملة.
- إذا لم تُرجع الأدوات بيانات، قل بوضوح إنه لا توجد معلومات متاحة — لا تخمّن.
- لا تذكر أسماء الأدوات أو تفاصيلها التقنية للمستخدم؛ قدّم الإجابة بشكل طبيعي وودود.
- إن سأل المستخدم عن خلية بالاسم، استخدم اسمها كما ذكره في معامل cellName.

# أسلوبك
- ودود، محترف، موجز ومباشر. استخدم تنسيق Markdown (قوائم، عناوين) عند الحاجة لتنظيم الإجابة.`

    // تحويل سجل المحادثة إلى صيغة الرسائل
    const modelMessages: ModelMessage[] = messages
      .filter((m: any) => m?.content && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => ({ role: m.role, content: String(m.content) }))

    console.log("[v0] Generating AI response with tool system...", { cells: userCells.length })

    const response = await generateWithTools({
      system,
      messages: modelMessages,
      tools,
      maxSteps: 6,
    })

    console.log("[v0] AI response generated successfully")

    return Response.json({ success: true, response: response.trim() })
  } catch (error) {
    console.error("[v0] Chat assistant error:", error)
    return Response.json(
      {
        error: "حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
