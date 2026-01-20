# دليل نظام الوكلاء الذكية - Kimi-K2

## نظرة عامة

تم إعادة بناء نظام الوكلاء الذكية لتطبيق Microcosm باستخدام **Kimi-K2-Instruct** - وكيل ذكي حقيقي (Agentic AI) مع قدرات function calling كاملة.

---

## البنية المعمارية

```
lib/ai-agents/
├── kimi-client.ts              # Kimi Agent Client الأساسي
├── chief-agent-kimi.ts         # الوكيل الرئيسي
├── approval-system.ts          # نظام الموافقات
├── monitoring-kimi.ts          # نظام المراقبة
├── tool-executor.ts            # محرك تنفيذ الأدوات
├── types.ts                    # التعريفات
├── config.ts                   # الإعدادات
└── tools/
    ├── index.ts                # تعريف الأدوات
    ├── github-tools.ts         # أدوات GitHub
    └── supabase-tools.ts       # أدوات قاعدة البيانات
```

---

## المميزات

### 1. وكيل ذكي حقيقي
- **Function Calling**: يستطيع Kimi استدعاء الأدوات بنفسه
- **Autonomous**: اتخاذ قرارات مستقلة
- **Context-Aware**: فهم عميق للسياق
- **Multi-Step Reasoning**: تفكير متعدد الخطوات

### 2. أدوات شاملة (30+ أداة)
- **GitHub**: قراءة، بحث، إنشاء issues/PRs، تحليل أمان
- **Database**: استعلام، تحديث، حذف
- **Analysis**: تحليل أخطاء، اقتراح حلول
- **Monitoring**: مراقبة النظام، الأداء
- **Moderation**: فحص محتوى، إدارة مستخدمين
- **Notifications**: إرسال إشعارات، تنبيهات

### 3. نظام موافقات
- **Risk Assessment**: تقييم مستوى الخطر
- **Auto-Approval**: موافقة تلقائية للإجراءات الآمنة
- **Manual Review**: مراجعة يدوية للإجراءات الخطيرة
- **Audit Trail**: سجل كامل لكل القرارات

### 4. مراقبة شاملة
- **Decision Tracking**: تتبع كل القرارات
- **Tool Metrics**: إحصائيات استخدام الأدوات
- **Performance**: مقاييس الأداء
- **Error Logging**: تسجيل الأخطاء

---

## الاستخدام

### 1. إنشاء وكيل

```typescript
import { createChiefAgent } from "@/lib/ai-agents/chief-agent-kimi"

const agent = createChiefAgent("conversation-123")
```

### 2. المحادثة

```typescript
const response = await agent.chat("حلل آخر 10 أخطاء في النظام")
console.log(response) // سيستخدم أدوات GitHub وقاعدة البيانات تلقائياً
```

### 3. اتخاذ قرار

```typescript
const decision = await agent.makeDecision(
  "رسالة تحتوي على محتوى مسيء",
  { message_id: "msg-123" }
)

// decision = {
//   action: "delete_message",
//   reasoning: "المحتوى ينتهك سياسات المجتمع...",
//   confidence: 95,
//   severity: "high",
//   auto_execute: true
// }
```

### 4. تحليل خطأ

```typescript
const analysis = await agent.analyzeAndFixError(
  new Error("Database connection failed"),
  { service: "api", endpoint: "/messages" }
)

// analysis = {
//   analysis: "السبب: timeout في الاتصال...",
//   suggestedFix: "زيادة connection pool...",
//   githubIssueCreated: true,
//   issueUrl: "https://github.com/..."
// }
```

### 5. الإشراف على المحتوى

```typescript
const moderation = await agent.moderateContent("msg-123")

// moderation = {
//   isViolation: true,
//   reason: "محتوى مسيء",
//   action: "delete_message"
// }
```

---

## API Routes

### POST `/api/ai-agents/kimi/chat`
محادثة مع الوكيل

```typescript
{
  "message": "ما آخر الأخطاء؟",
  "context": { "user_id": "..." },
  "conversationId": "conv-123"
}
```

### POST `/api/ai-agents/kimi/decide`
اتخاذ قرار

```typescript
{
  "scenario": "رسالة مخالفة",
  "context": { "message_id": "msg-123" }
}
```

### POST `/api/ai-agents/kimi/analyze-error`
تحليل خطأ

```typescript
{
  "error": {
    "message": "Connection timeout",
    "stack": "..."
  },
  "context": { "service": "api" }
}
```

### POST `/api/ai-agents/kimi/moderate`
الإشراف على محتوى

```typescript
{
  "messageId": "msg-123"
}
```

### GET `/api/ai-agents/kimi/approvals`
الحصول على طلبات الموافقة

### POST `/api/ai-agents/kimi/approvals`
الموافقة/الرفض

```typescript
{
  "requestId": "approval-123",
  "action": "approve" // or "reject"
}
```

---

## نظام الموافقات

### الإجراءات التي تحتاج موافقة:

- ✋ حظر مستخدم نهائياً
- ✋ حذف خلية
- ✋ تجميد خلية
- ✋ دمج Pull Request
- ✋ حذف ملفات
- ✋ تعديل إعدادات الإنتاج

### الإجراءات التلقائية:

- ✅ حذف رسالة
- ✅ تحذير مستخدم
- ✅ إخفاء محتوى
- ✅ إنشاء GitHub issue
- ✅ التعليق على issue
- ✅ إرسال إشعار

---

## قاعدة البيانات

### الجداول الرئيسية:

1. **agent_decisions** - سجل القرارات
2. **approval_requests** - طلبات الموافقة
3. **tool_executions** - تنفيذ الأدوات
4. **agent_conversations** - المحادثات
5. **agent_metrics** - الإحصائيات
6. **github_automated_actions** - إجراءات GitHub
7. **error_analysis** - تحليل الأخطاء

---

## المراقبة والإحصائيات

### الحصول على إحصائيات الوكيل:

```typescript
import { createAgentMonitoring } from "@/lib/ai-agents/monitoring-kimi"

const monitoring = createAgentMonitoring()
const stats = await monitoring.getAgentStats({
  agentType: "chief",
  timeRange: "24h"
})

// stats = {
//   totalDecisions: 150,
//   successRate: 98.5,
//   avgExecutionTime: 2500,
//   mostUsedTools: [
//     { tool: "query_database", count: 45 },
//     { tool: "read_file", count: 32 },
//     ...
//   ]
// }
```

### صحة النظام:

```typescript
const health = await monitoring.getSystemHealth()

// health = {
//   status: "healthy", // or "degraded" or "down"
//   agentStatus: { chief: true },
//   recentErrors: [...],
//   errorRate: 1.5
// }
```

---

## متغيرات البيئة

```env
# Hugging Face
HF_TOKEN=your_token

# GitHub
GITHUB_TOKEN=your_token
GITHUB_OWNER=your_org
GITHUB_REPO=your_repo

# Models (اختياري)
HF_PRIMARY_MODEL=moonshotai/Kimi-K2-Instruct-0905
HF_FALLBACK_MODEL=Qwen/QwQ-32B-Preview
HF_FAST_MODEL=meta-llama/Llama-3.3-70B-Instruct
```

---

## التكوين

في `lib/ai-agents/config.ts`:

```typescript
export const CHIEF_AGENT_CONFIG = {
  // النماذج
  models: {
    chief: AI_MODELS.PRIMARY,
    analysis: AI_MODELS.PRIMARY,
    moderation: AI_MODELS.FAST,
    fallback: AI_MODELS.FALLBACK,
  },

  // الحدود
  thresholds: {
    confidence: 0.85,
    maxRetries: 3,
  },

  // التنفيذ التلقائي
  autoExecute: {
    delete_message: true,
    warn_user: true,
    create_github_issue: true,
    ban_user: false, // يحتاج موافقة
  },

  // الموافقات
  approval: {
    enabled: true,
    highRiskActions: ["ban_user", "delete_cell", ...],
  },
}
```

---

## أمثلة متقدمة

### 1. سير عمل مخصص

```typescript
const agent = createChiefAgent()

// الخطوة 1: جمع المعلومات
const systemInfo = await agent.chat("احصل على آخر 10 أخطاء")

// الخطوة 2: تحليل
const analysis = await agent.chat(`حلل هذه الأخطاء: ${systemInfo}`)

// الخطوة 3: اتخاذ إجراء
if (analysis.includes("critical")) {
  await agent.chat("أنشئ GitHub issue للأخطاء الحرجة")
}
```

### 2. دمج مع Webhooks

```typescript
// في webhook handler
export async function POST(req: Request) {
  const event = await req.json()
  
  if (event.type === "error") {
    const agent = createChiefAgent()
    await agent.analyzeAndFixError(
      new Error(event.error),
      event.context
    )
  }
}
```

### 3. مراقبة مستمرة

```typescript
// في cron job
async function monitorSystem() {
  const agent = createChiefAgent()
  const monitoring = createAgentMonitoring()
  
  const health = await monitoring.getSystemHealth()
  
  if (health.status === "degraded") {
    await agent.chat("النظام في حالة متدهورة، حلل المشكلة")
  }
}
```

---

## الأمان

### 1. التحقق من الصلاحيات
جميع API routes تتحقق من المصادقة والصلاحيات

### 2. نظام الموافقات
الإجراءات الخطيرة تحتاج موافقة يدوية

### 3. Audit Trail
كل إجراء مسجل في قاعدة البيانات

### 4. Rate Limiting
حدود على استخدام API

### 5. Rollback
إمكانية التراجع عن الإجراءات (via snapshots)

---

## استكشاف الأخطاء

### المشكلة: الوكيل لا يستجيب

```typescript
// تحقق من:
1. HF_TOKEN موجود
2. النموذج متاح
3. الوكيل مفعّل في قاعدة البيانات
```

### المشكلة: الأدوات لا تعمل

```typescript
// تحقق من:
1. GITHUB_TOKEN صحيح
2. أذونات قاعدة البيانات
3. سجلات tool_executions
```

### المشكلة: بطء في الاستجابة

```typescript
// حلول:
1. استخدم FAST model للمهام البسيطة
2. قلل maxTokens
3. استخدم streaming للردود الطويلة
```

---

## التطوير المستقبلي

### المخطط:

- [ ] Memory System - ذاكرة طويلة المدى
- [ ] Learning from Feedback - التعلم من ردود الأفعال
- [ ] Multi-Agent Collaboration - تعاون الوكلاء
- [ ] Advanced Tool Creation - إنشاء أدوات جديدة تلقائياً
- [ ] Predictive Actions - إجراءات استباقية

---

## الدعم

للمساعدة أو الأسئلة:
- راجع الكود المصدري في `lib/ai-agents/`
- تحقق من السجلات في `agent_decisions`
- استخدم monitoring API للإحصائيات

---

## الخلاصة

نظام الوكلاء الجديد يوفر:
- ✅ ذكاء اصطناعي حقيقي مع قدرات اتخاذ القرار
- ✅ تكامل عميق مع GitHub
- ✅ أمان متقدم مع نظام موافقات
- ✅ مراقبة وتتبع شامل
- ✅ قابلية التوسع والتخصيص

الوكيل جاهز الآن للعمل كنائب ذكي للمالك! 🚀
