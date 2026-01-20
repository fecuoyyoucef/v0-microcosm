# نظام الوكلاء الذكية - Kimi-K2 Agentic System

## نظرة عامة

نظام وكلاء ذكي متكامل يستخدم **Kimi-K2-Instruct** كوكيل حقيقي (Agentic AI) مع قدرات كاملة على استخدام الأدوات واتخاذ القرارات.

## البنية التحتية

### قاعدة البيانات

تم إنشاء 7 جداول رئيسية:

1. **agent_decisions** - تتبع جميع قرارات الوكلاء
2. **approval_requests** - طلبات الموافقة على الإجراءات عالية المخاطر
3. **tool_executions** - سجل تنفيذ الأدوات
4. **agent_conversations** - محادثات الوكلاء
5. **agent_metrics** - مقاييس الأداء
6. **github_automated_actions** - الإجراءات التلقائية على GitHub
7. **error_analysis** - تحليل الأخطاء

### النماذج المستخدمة

- **Primary**: `moonshotai/Kimi-K2-Instruct-0905` (الوكيل الرئيسي)
- **Fallback**: `Qwen/QwQ-32B-Preview` (للمهام المعقدة)
- **Fast**: `meta-llama/Llama-3.3-70B-Instruct` (للمهام السريعة)

### Environment Variables

```env
# Hugging Face
HF_TOKEN=your_huggingface_api_key
HF_PRIMARY_MODEL=moonshotai/Kimi-K2-Instruct-0905
HF_FALLBACK_MODEL=Qwen/QwQ-32B-Preview
HF_FAST_MODEL=meta-llama/Llama-3.3-70B-Instruct

# GitHub
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_org_or_username
GITHUB_REPO=your_repo_name
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Supabase (موجودة بالفعل)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## الأدوات المتاحة للوكيل

### 1. GitHub Tools
- `read_file` - قراءة ملف من المستودع
- `search_code` - البحث في الكود
- `list_files` - عرض الملفات
- `create_issue` - إنشاء issue
- `comment_on_issue` - التعليق على issue
- `create_pr` - إنشاء Pull Request
- `merge_pr` - دمج PR (يحتاج موافقة)
- `update_file` - تحديث ملف (يحتاج موافقة)
- `get_commit_history` - عرض سجل الـ commits
- `analyze_security` - فحص الأمان

### 2. Database Tools (Supabase)
- `query_database` - استعلام من قاعدة البيانات
- `update_record` - تحديث سجل
- `delete_record` - حذف سجل (يحتاج موافقة)
- `run_rpc` - تنفيذ دالة مخزنة

### 3. Analysis Tools
- `analyze_error` - تحليل خطأ
- `find_similar_issues` - البحث عن مشاكل مشابهة
- `suggest_fix` - اقتراح إصلاح
- `analyze_code_quality` - تحليل جودة الكود

### 4. Monitoring Tools
- `get_system_health` - فحص صحة النظام
- `check_performance` - فحص الأداء
- `get_error_logs` - جلب سجلات الأخطاء

### 5. Communication Tools
- `send_notification` - إرسال إشعار
- `create_alert` - إنشاء تنبيه
- `notify_admin` - إشعار المالك

### 6. Content Moderation Tools
- `check_content` - فحص المحتوى
- `flag_message` - الإبلاغ عن رسالة
- `delete_message` - حذف رسالة
- `warn_user` - تحذير مستخدم
- `ban_user` - حظر مستخدم (يحتاج موافقة)

## نظام الموافقات

### مستويات المخاطر

- **low** - تنفيذ تلقائي
- **medium** - تنفيذ تلقائي + تسجيل
- **high** - يحتاج موافقة المالك
- **critical** - يحتاج موافقة + إشعار فوري

### الإجراءات عالية المخاطر

تحتاج موافقة يدوية:
- حظر مستخدم نهائياً
- حذف خلية
- تجميد خلية
- دمج Pull Request
- حذف ملف
- تعديل إعدادات الإنتاج

## الملفات الرئيسية

```
lib/ai-agents/
├── types.ts                    ✅ تعريفات الأنواع
├── config.ts                   ✅ الإعدادات
├── kimi-client.ts             🔄 قيد الإنشاء (المرحلة 3)
├── tool-executor.ts           🔄 قيد الإنشاء (المرحلة 2)
├── tools/
│   ├── index.ts               🔄 قيد الإنشاء (المرحلة 2)
│   ├── github-tools.ts        🔄 قيد الإنشاء (المرحلة 2)
│   ├── supabase-tools.ts      🔄 قيد الإنشاء (المرحلة 2)
│   ├── analysis-tools.ts      🔄 قيد الإنشاء (المرحلة 2)
│   ├── monitoring-tools.ts    🔄 قيد الإنشاء (المرحلة 2)
│   └── moderation-tools.ts    🔄 قيد الإنشاء (المرحلة 2)
├── chief-agent.ts             🔄 قيد التحديث (المرحلة 4)
├── specialized-agents.ts      🔄 قيد التحديث (المرحلة 4)
├── approval-system.ts         🔄 قيد الإنشاء (المرحلة 5)
└── monitoring.ts              🔄 قيد التحديث (المرحلة 7)
```

## المراحل المتبقية

### ✅ المرحلة 1: البنية التحتية (مكتملة)
- ✅ إضافة @huggingface/inference
- ✅ إنشاء database schema
- ✅ تحديث config.ts
- ✅ إنشاء types.ts

### 🔄 المرحلة 2: الأدوات (التالية)
- إنشاء tools/index.ts مع tool schemas
- إنشاء tool-executor.ts
- إنشاء github-tools.ts
- إنشاء supabase-tools.ts
- إنشاء باقي الأدوات

### ⏳ المرحلة 3: Kimi Client
- إنشاء kimi-client.ts
- تطبيق function calling
- تطبيق streaming
- معالجة الأخطاء

### ⏳ المراحل 4-8
- تحديث الوكلاء
- نظام الموافقات
- API Routes
- Testing
- Monitoring

## ملاحظات مهمة

1. **Kimi-K2 وكيل حقيقي** - ليس مجرد LLM، بل لديه قدرات كاملة على استخدام الأدوات
2. **نظام الأمان** - جميع الإجراءات عالية المخاطر تحتاج موافقة
3. **التتبع الكامل** - كل قرار وإجراء مسجل في قاعدة البيانات
4. **GitHub Integration** - تكامل عميق مع GitHub للإصلاحات التلقائية

## الاستخدام

```typescript
import { ChiefAgent } from "@/lib/ai-agents/chief-agent"

const agent = new ChiefAgent()

// اتخاذ قرار
const decision = await agent.makeDecision("تحليل خطأ", { error: "..." })

// تحليل خطأ
const analysis = await agent.analyzeAndFixError(error, context)

// مراقبة محتوى
const moderation = await agent.moderateContent(messageId)
```

## الإحصائيات

يمكن الحصول على إحصائيات الوكيل:

```typescript
import { AgentMonitoring } from "@/lib/ai-agents/monitoring"

const monitoring = new AgentMonitoring()
const stats = await monitoring.getAgentStats("24h")

console.log({
  total_decisions: stats.total_decisions,
  success_rate: stats.success_rate,
  avg_execution_time: stats.avg_execution_time_ms,
  most_used_tools: stats.most_used_tools
})
```
