# Admin Secret Key Setup

## ما هو ADMIN_SECRET_KEY؟

`ADMIN_SECRET_KEY` هو مفتاح سري يستخدم لحماية العمليات الحساسة في نظام الوكلاء الذكية، خاصة إعادة تعيين رصيد الـ HF tokens.

## الاستخدام

### 1. إضافة المتغير البيئي

\`\`\`bash
# في ملف Vercel Environment Variables
ADMIN_SECRET_KEY=your-super-secret-key-here-make-it-strong
\`\`\`

**نصائح الأمان:**
- استخدم كلمة سر قوية وعشوائية (أطول من 32 حرف)
- استخدم حروف كبيرة وصغيرة وأرقام ورموز خاصة
- لا تشاركها مع أحد
- غيّرها كل 3 أشهر

### 2. استخدام المفتاح

يمكن إرسال المفتاح بطريقتين:

#### الطريقة 1: عبر الـ Header (موصى بها - أكثر أماناً)

\`\`\`bash
curl -X POST \
  http://localhost:3000/api/ai-agents/kimi/token-health \
  -H "x-admin-secret: your-admin-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"action": "reset"}'
\`\`\`

#### الطريقة 2: عبر الـ Body (للمتوافقية)

\`\`\`bash
curl -X POST \
  http://localhost:3000/api/ai-agents/kimi/token-health \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reset",
    "adminKey": "your-admin-secret-key"
  }'
\`\`\`

## الـ Endpoints

### GET - فحص صحة الـ Tokens

\`\`\`bash
GET /api/ai-agents/kimi/token-health
\`\`\`

**الرد:**
\`\`\`json
{
  "success": true,
  "health": {
    "currentTokenIndex": 0,
    "currentToken": "HF_TOKEN1",
    "allTokensExhausted": false,
    "totalRequests": 1250
  },
  "tokens": [
    {
      "index": 1,
      "isExhausted": false,
      "requestCount": 500,
      "lastError": null
    },
    {
      "index": 2,
      "isExhausted": false,
      "requestCount": 0,
      "lastError": null
    },
    {
      "index": 3,
      "isExhausted": false,
      "requestCount": 0,
      "lastError": null
    }
  ]
}
\`\`\`

### POST - إعادة تعيين جميع الـ Tokens

\`\`\`bash
POST /api/ai-agents/kimi/token-health
\`\`\`

**مطلوب Admin Key:**
\`\`\`json
{
  "action": "reset",
  "adminKey": "your-admin-secret-key"
}
\`\`\`

**الرد الناجح:**
\`\`\`json
{
  "success": true,
  "message": "All HF tokens reset successfully",
  "timestamp": "2026-01-20T12:34:56.000Z"
}
\`\`\`

**الرد الخاطئ:**
\`\`\`json
{
  "success": false,
  "error": "Unauthorized - Invalid admin key"
}
\`\`\`

## كيفية الحصول على Admin Key

إذا كنت مالك المشروع:

1. اذهب إلى Vercel Dashboard
2. اختر مشروعك
3. اذهب إلى Settings → Environment Variables
4. أضف `ADMIN_SECRET_KEY` بقيمة قوية

## الأمان

- **لا تضع Admin Key في الكود مباشرة**
- **لا تشاركها في Discord أو Slack**
- **استخدم الـ Headers لإرسال المفتاح**
- **يتم مقارنة المفتاح بطريقة آمنة ضد timing attacks**
- **جميع المحاولات الفاشلة يتم تسجيلها**

## استكشاف الأخطاء

### خطأ: "Admin functionality not configured"
السبب: لم يتم تعيين `ADMIN_SECRET_KEY` كمتغير بيئي

**الحل:**
\`\`\`bash
ADMIN_SECRET_KEY=your-secret-key
\`\`\`

### خطأ: "Unauthorized - Invalid admin key"
السبب: المفتاح المرسل غير صحيح

**الحل:**
- تأكد من نسخ المفتاح بشكل صحيح
- تأكد من عدم وجود مسافات زائدة
- جرّب إعادة تعيين المفتاح

## أمثلة عملية

### Node.js / JavaScript

\`\`\`typescript
async function resetTokens(adminKey: string) {
  const response = await fetch(
    '/api/ai-agents/kimi/token-health',
    {
      method: 'POST',
      headers: {
        'x-admin-secret': adminKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'reset' }),
    }
  )
  
  return response.json()
}

// الاستخدام
const result = await resetTokens(process.env.ADMIN_SECRET_KEY!)
console.log(result)
\`\`\`

### Python

\`\`\`python
import requests

ADMIN_KEY = "your-admin-secret-key"

response = requests.post(
    "http://localhost:3000/api/ai-agents/kimi/token-health",
    headers={"x-admin-secret": ADMIN_KEY},
    json={"action": "reset"}
)

print(response.json())
\`\`\`

### cURL

\`\`\`bash
# فحص الصحة
curl http://localhost:3000/api/ai-agents/kimi/token-health

# إعادة تعيين الـ Tokens
curl -X POST \
  http://localhost:3000/api/ai-agents/kimi/token-health \
  -H "x-admin-secret: $ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "reset"}'
\`\`\`

## ملاحظات إضافية

- متغير `ADMIN_SECRET_KEY` **اختياري** - إذا لم تضفه، لا يمكن استخدام وظائف الإدارة
- كل محاولة إعادة تعيين يتم تسجيلها في السجلات
- الـ tokens الثلاثة تعود إلى الحالة الافتراضية بعد الإعادة
- لا يوجد تأكيد قبل الإعادة - كن حذراً
