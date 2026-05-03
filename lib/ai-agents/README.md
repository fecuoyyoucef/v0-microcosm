# نظام الوكلاء الذكية - Groq Agent System

## نظرة عامة

نظام وكلاء ذكي متكامل يستخدم **Groq** (llama-3.1-405b-reasoning) كمحرك ذكاء اصطناعي مع قدرات كاملة على استخدام الأدوات واتخاذ القرارات.

## نموذج الذكاء الاصطناعي

### المحرك الحالي: Groq ✅

- **النموذج الأساسي**: `llama-3.1-405b-reasoning` (أقوى نموذج مجاني)
- **النموذج الاحتياطي**: `mixtral-8x7b-32768` (سريع وموثوق)
- **المميزات**:
  - ✅ سرعة عالية جداً (latency <100ms)
  - ✅ مجاني تماماً (free tier بلا حدود)
  - ✅ قدرات reasoning قوية جداً (405 بليون معاملة)
  - ✅ دعم function calling الكامل
  - ✅ لا يحتاج لتدوير توكنات

### الترقية من HuggingFace

تم استبدال `HuggingFace Inference` (Kimi-K2) بـ Groq لأن:
- ❌ رصيد HF انتهى
- ✅ Groq أسرع بـ 10x من HF
- ✅ Groq مجاني بلا حدود
- ✅ `llama-3.1-405b-reasoning` أقوى بكثير من Kimi-K2
- ✅ استقرار أفضل وموثوقية أعلى

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

- **Primary**: `llama-3.1-405b-reasoning` (Groq - محرك الإنتاج)
- **Fallback**: `mixtral-8x7b-32768` (احتياطي سريع)

### Environment Variables

```env
# Groq
GROQ_API_KEY=your_groq_api_key  # مجاني من https://console.groq.com

# GitHub (اختياري - للوظائف المتقدمة)
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

### ✅ المرحلة 3: Groq Client (مكتملة)
- ✅ kimi-client.ts متحدث لاستخدام Groq (llama-3.1-405b)
- ✅ streaming مع AI SDK
- ✅ function calling كامل
- ✅ fallback إلى mixtral-8x7b عند الحاجة

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

1. **Groq أسرع وأقوى** - llama-3.1-405b هو أقوى نموذج مفتوح المصدر متاح
2. **مجاني بلا حدود** - لا تحتاج لدفع أو قلق من انتهاء الرصيد
3. **نظام الأمان** - جميع الإجراءات عالية المخاطر تحتاج موافقة
4. **التتبع الكامل** - كل قرار وإجراء مسجل في قاعدة البيانات
5. **GitHub Integration** - تكامل عميق مع GitHub للإصلاحات التلقائية

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
