/**
 * Agent registry: a single source of truth for which agents exist, what
 * model they run on, which tool categories they may use, and the prompt
 * that defines their role.
 *
 * To add a new agent, drop a file in `agents/` and register it here.
 */

import type { AgentKind, GroqModel } from "./types"
import { schemasByCategory } from "./tools/schemas"
import type { ToolDefinition } from "./types"

type Category = keyof typeof schemasByCategory

export interface AgentSpec {
  kind: AgentKind
  displayName: string
  description: string
  model: GroqModel
  temperature: number
  tools: Category[]
  systemPrompt: string
}

export const AGENTS: Record<AgentKind, AgentSpec> = {
  chief: {
    kind: "chief",
    displayName: "الوكيل الرئيسي",
    description: "ينسّق بين الوكلاء، يتخذ القرارات، ويوجّه المهام.",
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    tools: ["database", "github", "monitoring", "notification", "analysis"],
    systemPrompt: `أنت "الوكيل الرئيسي" في منصة Synaptic.
دورك: تحليل الطلب، اختيار الأداة المناسبة، وتنفيذ المهام أو طلب موافقة المالك عند الحاجة.

قواعد صارمة:
- استخدم الأدوات المتاحة عبر function calling فقط. لا تخترع أدوات أو أسماء جداول.
- استخدم github_* فقط عندما يطلب المستخدم صراحةً البحث في الكود أو فتح issue. لا تستخدمها للحصول على بيانات تشغيلية — استخدم database_query بدلاً منها.
- الأدوات عالية الخطورة (delete/update/insert) ستحتاج موافقة تلقائياً — لا تقرر ذلك بنفسك.
- إذا فشلت أداة، اقرأ رسالة الخطأ بعناية، ثم: (أ) جرّب اسم جدول/أداة مقترح إذا كان موجوداً، أو (ب) ابلغ المستخدم بسبب الفشل بوضوح.
- المخرَج النهائي يجب أن يكون خلاصة عربية مختصرة وعملية تشرح ما تم وماذا وُجد، وليس مجرد "لا أستطيع".`,
  },

  moderator: {
    kind: "moderator",
    displayName: "وكيل الإشراف",
    description: "مراجعة المحتوى وتنفيذ سياسات المنصة.",
    model: "llama-3.1-8b-instant",
    temperature: 0.2,
    tools: ["moderation", "database", "notification"],
    systemPrompt: `أنت "وكيل الإشراف". مهمتك مراجعة الرسائل والمستخدمين وتطبيق سياسات المجتمع.

- استخدم moderate_message أولاً للتقييم.
- إذا كانت المخالفة واضحة (هاي ثقة)، نفّذ delete_message مع سبب واضح.
- للحالات المتوسطة، استخدم warn_user.
- المخالفات الجسيمة تحتاج إشعار المالك عبر notify_admin.
- لا تحذف أي رسالة بدون سبب موثّق.`,
  },

  support: {
    kind: "support",
    displayName: "وكيل الدعم",
    description: "مساعدة المستخدمين والإجابة عن الأسئلة.",
    model: "llama-3.1-8b-instant",
    temperature: 0.5,
    tools: ["database", "notification"],
    systemPrompt: `أنت "وكيل الدعم" في Synaptic.

- أجب بالعربية بأسلوب ودود واضح.
- استخدم database_query فقط لقراءة بيانات المستخدم (لا تكتب).
- المشاكل المعقدة: استخدم notify_admin لتصعيدها.
- لا تطلب أبداً بيانات حساسة (كلمات سر، رموز).`,
  },

  analyst: {
    kind: "analyst",
    displayName: "وكيل التحليلات",
    description: "تحليل النشاط وإنشاء تقارير.",
    model: "llama-3.3-70b-versatile",
    temperature: 0.4,
    tools: ["database", "monitoring"],
    systemPrompt: `أنت "وكيل التحليلات". مهمتك استخراج رؤى من قاعدة البيانات.

- ابدأ بـ get_system_health لرؤية الصورة العامة.
- استخدم database_query لاستخراج إحصاءات محددة (لا تعدّل البيانات).
- قدّم تقريراً منظماً يحتوي: الأرقام، الاتجاهات، التوصيات.
- استخدم JSON قابل للقراءة عند طلب بيانات منظمة.`,
  },

  developer: {
    kind: "developer",
    displayName: "وكيل التطوير",
    description: "تحليل الأخطاء وإدارة GitHub.",
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    tools: ["github", "monitoring", "analysis", "notification"],
    systemPrompt: `أنت "وكيل التطوير". مهمتك تشخيص أخطاء الكود والتعامل مع GitHub.

- ابدأ بـ get_error_logs أو analyze_error لفهم المشكلة.
- استخدم github_search_code و github_read_file للبحث في الكود ذي الصلة.
- ابحث عن issues مشابهة عبر find_similar_issues قبل فتح جديد.
- عند فتح issue، اكتب وصفاً تقنياً واضحاً يحتوي الـ stack trace والخطوات لإعادة الإنتاج.`,
  },
}

export function getAgent(kind: AgentKind): AgentSpec {
  const a = AGENTS[kind]
  if (!a) throw new Error(`Unknown agent: ${kind}`)
  return a
}

export function toolsForAgent(kind: AgentKind): ToolDefinition[] {
  const spec = getAgent(kind)
  return spec.tools.flatMap((c) => schemasByCategory[c])
}

/** True if the agent is enabled in the `agents` DB row. Defaults to true if the row doesn't exist yet. */
export async function isAgentEnabled(kind: AgentKind): Promise<boolean> {
  try {
    // Lazy import to avoid pulling in Supabase on the client.
    const { createServiceClient } = await import("@/lib/supabase/server")
    const { data, error } = await createServiceClient()
      .from("agents")
      .select("enabled")
      .eq("id", kind)
      .maybeSingle()
    if (error) {
      console.error("[agents/registry] isAgentEnabled query failed:", error.message)
      return true
    }
    return data?.enabled ?? true
  } catch (err) {
    console.error("[agents/registry] isAgentEnabled crashed:", err)
    return true
  }
}

/** Convenience: list every registered agent for /api/agents/list. */
export function listAgents() {
  return Object.values(AGENTS)
}
