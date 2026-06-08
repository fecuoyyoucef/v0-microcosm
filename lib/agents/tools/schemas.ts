/**
 * Tool catalog advertised to Groq.
 *
 * One schema per tool, in Groq/OpenAI function-calling format. The model
 * receives only the subset relevant to a given agent (see registry.ts) so
 * prompts stay focused and token counts stay low.
 *
 * IMPORTANT: never describe a tool here that the executor does not also
 * implement. Mismatches make the model hallucinate phantom capabilities.
 */

import type { ToolDefinition } from "../types"

export const githubSchemas: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "github_read_file",
      description: "قراءة محتوى ملف من مستودع GitHub.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "مسار الملف داخل المستودع." },
          ref: { type: "string", description: "اسم الفرع أو SHA. الافتراضي: main" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_search_code",
      description: "البحث في كود المستودع عن أنماط أو دوال أو نصوص.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "نص البحث." },
          extension: { type: "string", description: "امتداد اختياري مثل ts, tsx, sql." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_list_files",
      description: "عرض الملفات داخل مجلد. اتركه فارغًا للجذر.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_create_issue",
      description: "إنشاء issue جديد على المستودع.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          labels: { type: "array", items: { type: "string" } },
        },
        required: ["title", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_comment_on_issue",
      description: "إضافة تعليق على issue قائم.",
      parameters: {
        type: "object",
        properties: {
          issue_number: { type: "number" },
          comment: { type: "string" },
        },
        required: ["issue_number", "comment"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_get_commit_history",
      description: "آخر عمليات الـ commit لملف أو مجلد.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_get_security_alerts",
      description: "تنبيهات Dependabot الأمنية الحالية.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "find_similar_issues",
      description: "البحث عن issues مشابهة لمشكلة ما.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          state: { type: "string", enum: ["open", "closed", "all"] },
        },
        required: ["query"],
      },
    },
  },
]

export const databaseSchemas: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "database_query",
      description: "قراءة صفوف من جدول. آمن دائمًا.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string" },
          select: { type: "string", description: "أعمدة مفصولة بفواصل أو * للكل." },
          filters: { type: "object", description: "زوج عمود/قيمة للمساواة." },
          limit: { type: "number" },
          order_by: { type: "string", description: "مثل: created_at.desc" },
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "database_insert",
      description: "إدراج صف. يتطلب موافقة المالك.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string" },
          data: { type: "object" },
        },
        required: ["table", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "database_update",
      description: "تحديث صفوف. يتطلب موافقة المالك.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string" },
          filters: { type: "object" },
          data: { type: "object" },
        },
        required: ["table", "filters", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "database_delete",
      description: "حذف صفوف. خطر — يتطلب موافقة.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string" },
          filters: { type: "object" },
        },
        required: ["table", "filters"],
      },
    },
  },
]

export const moderationSchemas: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "moderate_message",
      description: "تقييم رسالة لمعرفة ما إذا كانت مخالفة.",
      parameters: {
        type: "object",
        properties: {
          message_id: { type: "string" },
          content: { type: "string" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_message",
      description: "حذف رسالة مخالفة. تنفيذ تلقائي مسموح.",
      parameters: {
        type: "object",
        properties: {
          message_id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["message_id", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "warn_user",
      description: "إرسال تحذير لمستخدم.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string" },
          reason: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["user_id", "reason"],
      },
    },
  },
]

export const monitoringSchemas: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_system_health",
      description: "ملخّص صحة النظام للفترة الزمنية المحددة.",
      parameters: {
        type: "object",
        properties: {
          time_range: { type: "string", enum: ["1h", "24h", "7d", "30d"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_error_logs",
      description: "أحدث سجلات الأخطاء.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number" },
          severity: { type: "string", enum: ["error", "warning", "critical"] },
        },
      },
    },
  },
]

export const notificationSchemas: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "notify_admin",
      description: "إرسال إشعار للمالك/المدير.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          message: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        },
        required: ["title", "message"],
      },
    },
  },
]

export const analysisSchemas: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "analyze_error",
      description: "تحليل خطأ في الكود واقتراح حلول مبدئية.",
      parameters: {
        type: "object",
        properties: {
          error_message: { type: "string" },
          stack_trace: { type: "string" },
          context: { type: "object" },
        },
        required: ["error_message"],
      },
    },
  },
]

export const allSchemas: ToolDefinition[] = [
  ...githubSchemas,
  ...databaseSchemas,
  ...moderationSchemas,
  ...monitoringSchemas,
  ...notificationSchemas,
  ...analysisSchemas,
]

export const schemasByCategory = {
  github: githubSchemas,
  database: databaseSchemas,
  moderation: moderationSchemas,
  monitoring: monitoringSchemas,
  notification: notificationSchemas,
  analysis: analysisSchemas,
}

export function selectSchemas(
  categories: Array<keyof typeof schemasByCategory>,
): ToolDefinition[] {
  return categories.flatMap((c) => schemasByCategory[c])
}
