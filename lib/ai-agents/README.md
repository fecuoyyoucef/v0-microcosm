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
├── config.ts                   ✅ الإعدادات (HF_TOKEN1/2/3 rotation + GitHub)
├── kimi-client.ts              ✅ Kimi Client مكتمل (streaming + function calling)
├── token-rotation.ts           ✅ نظام تدوير التوكنات (HF_TOKEN1→2→3 تلقائي)
├── tool-executor.ts            ✅ مكتمل - يوجه لجميع الأدوات
├── tools/
│   ├── index.ts                ✅ مكتمل - 25+ أداة معرّفة
│   ├── github-tools.ts         ✅ مكتمل - 9 دوال GitHub عبر Octokit
│   └── supabase-tools.ts       ✅ مكتمل - query/insert/update/delete/rpc
├── chief-agent.ts              ✅ الوكيل الرئيسي
├── chief-agent-enhanced.ts     ✅ نسخة محسّنة
├── chief-agent-kimi.ts         ✅ نسخة Kimi المتخصصة
├── specialized-agents.ts       ✅ وكلاء متخصصون
├── approval-system.ts          ✅ نظام الموافقات
├── monitoring.ts               ✅ المراقبة
├── monitoring-kimi.ts          ✅ مراقبة Kimi
├── error-analysis.ts           ✅ تحليل الأخطاء
├── error-analyzer.ts           ✅ محلل الأخطاء
├── github-agent.ts             ✅ وكيل GitHub
├── github-analyzer.ts          ✅ محلل GitHub
└── undo-system.ts              ✅ نظام التراجع
```

## حالة المراحل

### ✅ المرحلة 1: البنية التحتية (مكتملة)
- ✅ إضافة @huggingface/inference
- ✅ إنشاء database schema (7 جداول)
- ✅ تحديث config.ts
- ✅ إنشاء types.ts

### ✅ المرحلة 2: الأدوات (مكتملة)
- ✅ tools/index.ts مع 25+ tool schema
- ✅ tool-executor.ts مع routing كامل
- ✅ github-tools.ts (Octokit)
- ✅ supabase-tools.ts (query/insert/update/delete/rpc)
- ✅ أدوات التحليل والمراقبة والإشراف داخل tool-executor

### ✅ المرحلة 3: Kimi Client (مكتملة)
- ✅ kimi-client.ts مع streaming كامل
- ✅ function calling + parseToolCallsFromText
- ✅ تدوير تلقائي بين HF_TOKEN1/2/3
- ✅ fallback إلى نموذج بديل عند الفشل

### ✅ المراحل 4-7 (مكتملة)
- ✅ الوكلاء المتخصصون (specialized-agents.ts)
- ✅ نظام الموافقات (approval-system.ts)
- ✅ مراقبة الأداء (monitoring.ts + monitoring-kimi.ts)
- ✅ تحليل الأخطاء (error-analysis.ts)

### ⚠️ نقاط تحتاج انتباه
- `analyze_error` و`suggest_fix` في tool-executor تعيد placeholder، يمكن تحسينها لاحقاً
- `check_performance` غير مطبّقة بالكامل بعد
- إشعارات المدير تعتمد على console.log بدلاً من webhook فعلي

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
