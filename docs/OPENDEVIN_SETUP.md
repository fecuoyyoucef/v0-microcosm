# OpenDevin + Kimi-K2-Instruct Integration Guide

## نظرة عامة

تم دمج OpenDevin (OpenHands) كخدمة API مع نظام Microcosm. يستخدم Kimi-K2-Instruct كنموذج اللغة الأساسي، مما يمنح OpenDevin قدرات ذكاء اصطناعي متقدمة لتنفيذ مهام البرمجة تلقائياً.

## المكونات

### 1. OpenDevin API Server
- **الموقع:** `/docker/opendevin/`
- **المنفذ:** 8080
- **اللغة:** Python + FastAPI
- **الوظيفة:** استقبال المهام، تشغيل OpenDevin، إرجاع النتائج

### 2. Kimi-K2-Instruct Backend
- **النموذج:** `moonshotai/Kimi-K2-Instruct-0905`
- **API:** Hugging Face Inference API
- **Tokens:** نظام التدوير (HF_TOKEN1, 2, 3)

### 3. Next.js Integration
- **المسارات:**
  - `POST /api/opendevin/tasks` - إنشاء مهمة جديدة
  - `GET /api/opendevin/tasks` - قائمة المهام
  - `GET /api/opendevin/tasks/[taskId]` - حالة المهمة
  - `DELETE /api/opendevin/tasks/[taskId]` - حذف مهمة

## خطوات الإعداد

### 1. إعداد البيئة

أضف المتغيرات البيئية التالية:

\`\`\`bash
# Hugging Face Tokens (متوفرة بالفعل)
HF_TOKEN1=your_token_1
HF_TOKEN2=your_token_2
HF_TOKEN3=your_token_3

# OpenDevin API URL
OPENDEVIN_API_URL=http://localhost:8080

# Optional: Custom HF API Base
HF_API_BASE=https://api-inference.huggingface.co/models
\`\`\`

### 2. تشغيل OpenDevin عبر Docker

\`\`\`bash
# الانتقال إلى مجلد Docker
cd docker/opendevin

# بناء وتشغيل الخدمة
docker-compose up -d

# مراقبة السجلات
docker-compose logs -f

# إيقاف الخدمة
docker-compose down
\`\`\`

### 3. إعداد قاعدة البيانات

\`\`\`bash
# تشغيل SQL script
# في v0، استخدم SystemAction لتنفيذ:
scripts/create-opendevin-tables.sql
\`\`\`

### 4. التحقق من التشغيل

\`\`\`bash
# اختبار API
curl http://localhost:8080/health

# اختبار Kimi-K2 connection
curl -X POST http://localhost:8080/api/llm/test
\`\`\`

## الاستخدام

### من Next.js API

\`\`\`typescript
// إنشاء مهمة جديدة
const response = await fetch('/api/opendevin/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    instruction: 'أنشئ صفحة React جديدة لعرض قائمة المستخدمين',
    project_path: '/workspace/my-project',
    max_iterations: 30
  })
})

const { task_id } = await response.json()

// مراقبة حالة المهمة
const statusResponse = await fetch(`/api/opendevin/tasks/${task_id}`)
const status = await statusResponse.json()

console.log(`Status: ${status.status}`)
console.log(`Progress: ${status.progress}%`)
console.log(`Logs:`, status.logs)
\`\`\`

### مباشرة إلى OpenDevin API

\`\`\`bash
# إنشاء مهمة
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "أنشئ component React لعرض البيانات",
    "project_path": "/workspace",
    "max_iterations": 30
  }'

# الحصول على حالة المهمة
curl http://localhost:8080/api/tasks/{task_id}
\`\`\`

## أمثلة على المهام

### 1. إنشاء مكون React

\`\`\`json
{
  "instruction": "أنشئ مكون React يعرض جدول بيانات المستخدمين مع إمكانية البحث والتصفية. استخدم TypeScript و Tailwind CSS."
}
\`\`\`

### 2. إصلاح خطأ

\`\`\`json
{
  "instruction": "هناك خطأ في ملف /workspace/lib/utils.ts في الدالة formatDate. قم بإصلاحه وإضافة unit tests."
}
\`\`\`

### 3. إضافة ميزة جديدة

\`\`\`json
{
  "instruction": "أضف ميزة تصدير البيانات إلى CSV في صفحة /app/users/page.tsx. استخدم مكتبة papaparse."
}
\`\`\`

### 4. مراجعة الكود

\`\`\`json
{
  "instruction": "راجع ملفات المكونات في /components/chat/ وقدم اقتراحات للتحسين من ناحية الأداء والأمان."
}
\`\`\`

## البنية المعمارية

\`\`\`
┌─────────────────────────────────────────────┐
│         Microcosm Next.js App               │
│  /api/opendevin/tasks/*                     │
└─────────────┬───────────────────────────────┘
              │
              │ HTTP REST API
              ▼
┌─────────────────────────────────────────────┐
│     OpenDevin API Server (FastAPI)          │
│     docker/opendevin/api_server.py          │
│     Port: 8080                              │
└─────────────┬───────────────────────────────┘
              │
              │ Python SDK
              ▼
┌─────────────────────────────────────────────┐
│         OpenDevin Core Engine               │
│     - AgentController                       │
│     - CodeActAgent                          │
│     - Sandbox Environment                   │
└─────────────┬───────────────────────────────┘
              │
              │ API Calls
              ▼
┌─────────────────────────────────────────────┐
│      Kimi-K2-Instruct (Hugging Face)        │
│   moonshotai/Kimi-K2-Instruct-0905          │
│   Token Rotation: HF_TOKEN1→2→3             │
└─────────────────────────────────────────────┘
\`\`\`

## مراقبة وتسجيل

### السجلات

\`\`\`bash
# سجلات OpenDevin
docker-compose logs opendevin

# سجلات مباشرة
docker-compose logs -f opendevin
\`\`\`

### قاعدة البيانات

\`\`\`sql
-- عرض جميع المهام
SELECT * FROM opendevin_tasks ORDER BY created_at DESC;

-- المهام النشطة
SELECT * FROM opendevin_tasks WHERE status = 'running';

-- إحصائيات
SELECT 
  status,
  COUNT(*) as count,
  AVG(progress) as avg_progress
FROM opendevin_tasks
GROUP BY status;
\`\`\`

## استكشاف الأخطاء

### المشكلة: OpenDevin لا يستجيب

\`\`\`bash
# التحقق من حالة الحاوية
docker ps | grep opendevin

# إعادة تشغيل
docker-compose restart

# فحص السجلات
docker-compose logs --tail=100 opendevin
\`\`\`

### المشكلة: Kimi-K2 يفشل

\`\`\`bash
# اختبار الاتصال
curl -X POST http://localhost:8080/api/llm/test

# التحقق من Token
echo $HF_TOKEN1
\`\`\`

### المشكلة: المهمة عالقة

\`\`\`sql
-- إعادة تعيين المهام العالقة
UPDATE opendevin_tasks 
SET status = 'failed', 
    error = 'Task timeout'
WHERE status = 'running' 
AND updated_at < NOW() - INTERVAL '1 hour';
\`\`\`

## الأمان

1. **Authentication:** فقط المستخدمون المسجلون يمكنهم إنشاء المهام
2. **Authorization:** فقط Admin يمكنهم إنشاء مهام
3. **RLS:** كل مستخدم يرى مهامه فقط
4. **Sandbox:** OpenDevin يعمل في بيئة معزولة
5. **Rate Limiting:** يتم تطبيقه على مستوى API

## التطوير المستقبلي

- [ ] WebSocket support للتحديثات المباشرة
- [ ] Queue system (Redis/Bull) لإدارة المهام
- [ ] Multiple workspace support
- [ ] Code review والموافقة قبل التطبيق
- [ ] Integration مع GitHub Actions
- [ ] Dashboard UI للمراقبة
- [ ] Metrics & Analytics

## الموارد

- [OpenDevin GitHub](https://github.com/All-Hands-AI/OpenHands)
- [Kimi-K2 Model Card](https://huggingface.co/moonshotai/Kimi-K2-Instruct-0905)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Compose Guide](https://docs.docker.com/compose/)
