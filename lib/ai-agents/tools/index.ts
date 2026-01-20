/**
 * AI Agent Tools Schema
 * 
 * This file defines all available tools that Kimi-K2 agent can use.
 * Tools follow OpenAI function calling format for compatibility.
 */

import type { Tool } from "../types"

// ============================
// GitHub Tools
// ============================

export const githubTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "github_read_file",
      description: "قراءة محتوى ملف من GitHub repository. استخدمها لقراءة الكود أو الملفات.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "مسار الملف في المستودع، مثل: 'app/page.tsx' أو 'lib/utils.ts'",
          },
          ref: {
            type: "string",
            description: "اسم الفرع أو الـ commit SHA. افتراضي: 'main'",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_search_code",
      description: "البحث في الكود داخل المستودع. استخدمها للعثور على دوال، مكونات، أو أنماط معينة.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "استعلام البحث. يمكنك استخدام الكلمات المفتاحية أو أسماء الدوال",
          },
          extension: {
            type: "string",
            description: "تصفية حسب امتداد الملف مثل: 'ts', 'tsx', 'sql'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_list_files",
      description: "عرض قائمة بالملفات في مجلد معين من المستودع.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "مسار المجلد. فارغ للمجلد الجذر، أو مثل: 'app/api'",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_create_issue",
      description: "إنشاء GitHub issue جديد. استخدمها للإبلاغ عن أخطاء أو اقتراح تحسينات.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "عنوان الـ issue واضح ووصفي",
          },
          body: {
            type: "string",
            description: "وصف تفصيلي للـ issue بصيغة Markdown",
          },
          labels: {
            type: "array",
            items: { type: "string" },
            description: "تصنيفات مثل: ['bug', 'enhancement', 'urgent']",
          },
          assignees: {
            type: "array",
            items: { type: "string" },
            description: "أسماء المستخدمين لتعيينهم",
          },
        },
        required: ["title", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_comment_on_issue",
      description: "إضافة تعليق على issue موجود.",
      parameters: {
        type: "object",
        properties: {
          issue_number: {
            type: "number",
            description: "رقم الـ issue",
          },
          comment: {
            type: "string",
            description: "نص التعليق بصيغة Markdown",
          },
        },
        required: ["issue_number", "comment"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_close_issue",
      description: "إغلاق issue معين.",
      parameters: {
        type: "object",
        properties: {
          issue_number: {
            type: "number",
            description: "رقم الـ issue المراد إغلاقه",
          },
          comment: {
            type: "string",
            description: "تعليق اختياري قبل الإغلاق",
          },
        },
        required: ["issue_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_create_pull_request",
      description: "إنشاء Pull Request جديد. يستخدم للتعديلات المقترحة على الكود.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "عنوان الـ PR",
          },
          body: {
            type: "string",
            description: "وصف التغييرات",
          },
          head: {
            type: "string",
            description: "اسم الفرع المصدر",
          },
          base: {
            type: "string",
            description: "اسم الفرع المستهدف (غالباً 'main')",
          },
        },
        required: ["title", "body", "head", "base"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_get_commit_history",
      description: "الحصول على تاريخ الـ commits لملف أو مجلد معين.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "مسار الملف أو المجلد. فارغ لكل المستودع",
          },
          limit: {
            type: "number",
            description: "عدد الـ commits المطلوبة. افتراضي: 50",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_get_security_alerts",
      description: "الحصول على تنبيهات الأمان (vulnerabilities) للمستودع.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
]

// ============================
// Database Tools (Supabase)
// ============================

export const databaseTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "database_query",
      description: "استعلام قاعدة البيانات. استخدمها لقراءة البيانات من أي جدول.",
      parameters: {
        type: "object",
        properties: {
          table: {
            type: "string",
            description: "اسم الجدول مثل: 'messages', 'profiles', 'cells'",
          },
          select: {
            type: "string",
            description: "الأعمدة المطلوبة. استخدم '*' للكل أو 'id,content,created_at'",
          },
          filters: {
            type: "object",
            description: "شروط البحث كـ object، مثل: {user_id: 'xxx', status: 'active'}",
          },
          limit: {
            type: "number",
            description: "عدد النتائج. افتراضي: 100",
          },
          order_by: {
            type: "string",
            description: "ترتيب النتائج مثل: 'created_at' أو 'created_at.desc'",
          },
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "database_insert",
      description: "إضافة سجل جديد إلى جدول.",
      parameters: {
        type: "object",
        properties: {
          table: {
            type: "string",
            description: "اسم الجدول",
          },
          data: {
            type: "object",
            description: "البيانات المراد إضافتها",
          },
        },
        required: ["table", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "database_update",
      description: "تحديث سجل موجود في قاعدة البيانات.",
      parameters: {
        type: "object",
        properties: {
          table: {
            type: "string",
            description: "اسم الجدول",
          },
          filters: {
            type: "object",
            description: "شروط لتحديد السجل، مثل: {id: 'xxx'}",
          },
          data: {
            type: "object",
            description: "البيانات الجديدة",
          },
        },
        required: ["table", "filters", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "database_delete",
      description: "حذف سجل من قاعدة البيانات. استخدمها بحذر!",
      parameters: {
        type: "object",
        properties: {
          table: {
            type: "string",
            description: "اسم الجدول",
          },
          filters: {
            type: "object",
            description: "شروط لتحديد السجل المراد حذفه",
          },
        },
        required: ["table", "filters"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "database_rpc",
      description: "استدعاء دالة SQL مخصصة (RPC).",
      parameters: {
        type: "object",
        properties: {
          function_name: {
            type: "string",
            description: "اسم الدالة",
          },
          params: {
            type: "object",
            description: "معاملات الدالة",
          },
        },
        required: ["function_name"],
      },
    },
  },
]

// ============================
// Analysis Tools
// ============================

export const analysisTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "analyze_error",
      description: "تحليل خطأ في النظام والبحث عن حلول. استخدمها عند حدوث أخطاء.",
      parameters: {
        type: "object",
        properties: {
          error_message: {
            type: "string",
            description: "رسالة الخطأ الكاملة",
          },
          stack_trace: {
            type: "string",
            description: "الـ stack trace إن وجد",
          },
          context: {
            type: "object",
            description: "معلومات إضافية عن السياق",
          },
        },
        required: ["error_message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_similar_issues",
      description: "البحث عن GitHub issues مشابهة للمشكلة الحالية.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "وصف المشكلة أو الخطأ",
          },
          state: {
            type: "string",
            enum: ["open", "closed", "all"],
            description: "حالة الـ issues. افتراضي: 'all'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_fix",
      description: "اقتراح إصلاح لخطأ أو مشكلة معينة بناءً على تحليل الكود.",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "مسار الملف الذي يحتوي على المشكلة",
          },
          issue_description: {
            type: "string",
            description: "وصف المشكلة",
          },
          code_snippet: {
            type: "string",
            description: "الكود المتعلق بالمشكلة",
          },
        },
        required: ["issue_description"],
      },
    },
  },
]

// ============================
// Monitoring Tools
// ============================

export const monitoringTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "get_system_health",
      description: "الحصول على حالة النظام الصحية والإحصائيات.",
      parameters: {
        type: "object",
        properties: {
          time_range: {
            type: "string",
            enum: ["1h", "24h", "7d", "30d"],
            description: "النطاق الزمني. افتراضي: '24h'",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_error_logs",
      description: "الحصول على سجلات الأخطاء الأخيرة.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "عدد السجلات. افتراضي: 50",
          },
          severity: {
            type: "string",
            enum: ["error", "warning", "critical"],
            description: "مستوى الخطورة",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_performance",
      description: "فحص أداء النظام والبحث عن مشاكل محتملة.",
      parameters: {
        type: "object",
        properties: {
          metric_type: {
            type: "string",
            enum: ["response_time", "database_queries", "api_calls"],
            description: "نوع المقياس",
          },
        },
        required: [],
      },
    },
  },
]

// ============================
// Moderation Tools
// ============================

export const moderationTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "moderate_message",
      description: "مراجعة رسالة للتحقق من مطابقتها للسياسات. تُرجع تقييم وتوصيات.",
      parameters: {
        type: "object",
        properties: {
          message_id: {
            type: "string",
            description: "معرّف الرسالة",
          },
          content: {
            type: "string",
            description: "محتوى الرسالة",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_message",
      description: "حذف رسالة مخالفة. استخدمها فقط للمخالفات الواضحة.",
      parameters: {
        type: "object",
        properties: {
          message_id: {
            type: "string",
            description: "معرّف الرسالة",
          },
          reason: {
            type: "string",
            description: "سبب الحذف",
          },
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
          user_id: {
            type: "string",
            description: "معرّف المستخدم",
          },
          reason: {
            type: "string",
            description: "سبب التحذير",
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "مستوى الخطورة",
          },
        },
        required: ["user_id", "reason"],
      },
    },
  },
]

// ============================
// Notification Tools
// ============================

export const notificationTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "notify_admin",
      description: "إرسال إشعار للمدير/المالك. استخدمها للمسائل المهمة فقط.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "عنوان الإشعار",
          },
          message: {
            type: "string",
            description: "محتوى الإشعار",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "مستوى الأولوية",
          },
        },
        required: ["title", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_system_alert",
      description: "إنشاء تنبيه نظام لحدث معين.",
      parameters: {
        type: "object",
        properties: {
          alert_type: {
            type: "string",
            description: "نوع التنبيه",
          },
          description: {
            type: "string",
            description: "وصف التنبيه",
          },
          data: {
            type: "object",
            description: "بيانات إضافية",
          },
        },
        required: ["alert_type", "description"],
      },
    },
  },
]

// ============================
// All Tools Combined
// ============================

export const allTools: Tool[] = [
  ...githubTools,
  ...databaseTools,
  ...analysisTools,
  ...monitoringTools,
  ...moderationTools,
  ...notificationTools,
]

// Tool categories for selective enabling
export const toolCategories = {
  github: githubTools,
  database: databaseTools,
  analysis: analysisTools,
  monitoring: monitoringTools,
  moderation: moderationTools,
  notification: notificationTools,
}

// Helper to get tools by names
export function getToolsByNames(names: string[]): Tool[] {
  return allTools.filter((tool) => names.includes(tool.function.name))
}

// Helper to get tools by category
export function getToolsByCategory(categories: string[]): Tool[] {
  const tools: Tool[] = []
  for (const category of categories) {
    if (category in toolCategories) {
      tools.push(...toolCategories[category as keyof typeof toolCategories])
    }
  }
  return tools
}
