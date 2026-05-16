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
- استخدم الأدوات المتاحة عبر function calling. لا تخترع أدوات.
- الأدوات عالية الخطورة (delete/update/insert في قاعدة البيانات) ستحتاج موافقة تلقائياً — لا تقرر ذلك بنفسك.
- كن مختصراً. أعطِ خلاصة عملية بالعربية بعد تنفيذ الأدوات.
- إذا فشلت أداة، حلل السبب وحاول بديلاً أو أبلغ المالك.`,
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
