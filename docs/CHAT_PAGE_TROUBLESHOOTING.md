# صفحة /chat - دليل استكشاف الأخطاء

## المشاكل الشائعة والحلول

### 1. الصفحة فارغة أو لا تحمّل

**الأسباب المحتملة:**
- عدم وجود بيانات ملف المستخدم (profile)
- عدم وجود عضويات في خلايا
- خطأ في جلب البيانات من Supabase
- عطل في مكون SuggestedCells أو SmartRecommendations

**خطوات الحل:**

1. **تحقق من بيانات المستخدم:**
\`\`\`bash
زر: /api/debug/chat-page
\`\`\`

هذا سيعطيك معلومات عن:
- معرّف المستخدم
- البريد الإلكتروني
- وجود الملف الشخصي
- عدد الخلايا المتعلقة به

2. **افتح أدوات المتطور في المتصفح:**
\`\`\`
F12 أو Cmd+Option+I (Mac)
\`\`\`

ابحث عن رسائل الخطأ في Console

3. **تحقق من سجلات الأخطاء:**
انظر إلى الرسائل التي تبدأ بـ `[v0]`

### 2. الرسائل التي قد تظهر

#### "لا توجد خلايا بعد"
- هذا طبيعي إذا كان المستخدم جديد
- يمكنه إنشاء خلية جديدة أو الانضمام بدعوة

#### خطأ في SuggestedCells
- تم تفعيل نظام matching ولكن حدث خطأ
- الحل: تعطيل الميزة مؤقتاً عبر:
\`\`\`sql
UPDATE system_settings 
SET value = 'false' 
WHERE key = 'synaptic_matching_enabled';
\`\`\`

#### خطأ في SmartRecommendations
- يحدث فقط للمستخدمين الذين أكملوا الاستبيان
- غير حرجي ولا يؤثر على الصفحة

### 3. خطوات التشخيص

**الخطوة 1:** تحقق من الاتصال
\`\`\`bash
curl /api/debug/chat-page
\`\`\`

**الخطوة 2:** تحقق من Console في المتصفح
\`\`\`javascript
// ستظهر رسائل مثل:
// [v0] HomePageContent mounted with initialGroups: 5
// [v0] Profile loaded: أحمد
// [v0] Fetching suggested cells for user: user-123
\`\`\`

**الخطوة 3:** تحقق من قاعدة البيانات
\`\`\`sql
-- تحقق من وجود الملف الشخصي
SELECT * FROM profiles WHERE id = 'your-user-id';

-- تحقق من العضويات
SELECT * FROM group_members WHERE user_id = 'your-user-id';

-- تحقق من الإعدادات
SELECT * FROM system_settings;
\`\`\`

### 4. حل سريع

إذا لم تحل الخطوات السابقة المشكلة:

1. **امسح ذاكرة التخزين المؤقت:**
\`\`\`javascript
// في Console:
localStorage.clear()
sessionStorage.clear()
\`\`\`

2. **أعد تحميل الصفحة:**
\`\`\`
Cmd+Shift+R (Mac) أو Ctrl+Shift+R (Windows)
\`\`\`

3. **حاول تسجيل الخروج والدخول مجدداً**

### 5. تعطيل المكونات الإشكالية

إذا كان المشكلة في مكون معين، يمكنك تعطيله مؤقتاً:

**تعطيل SuggestedCells:**
\`\`\`sql
UPDATE system_settings 
SET value = 'false' 
WHERE key = 'synaptic_matching_enabled';
\`\`\`

**تعطيل SmartRecommendations:**
في `/components/chat/home-page-content.tsx`:
\`\`\`tsx
// غيّر هذا:
{hasCompletedSurvey && (
  <SmartRecommendations userId={userId} />
)}

// إلى:
{false && (
  <SmartRecommendations userId={userId} />
)}
\`\`\`

### 6. معلومات للمطورين

**ملفات ذات صلة:**
- `/app/chat/page.tsx` - صفحة الدخول
- `/app/chat/layout.tsx` - تخطيط الصفحة
- `/components/chat/home-page-content.tsx` - المحتوى الرئيسي
- `/components/groups/suggested-cells.tsx` - الخلايا المقترحة
- `/components/groups/smart-recommendations.tsx` - التوصيات الذكية

**سجلات التطوير:**
- افتح الـ DevTools (F12)
- ابحث عن رسائل تبدأ بـ `[v0]`
- اتحقق من Network tab لأي طلبات فاشلة

### 7. الإبلاغ عن المشكلة

عند الإبلاغ عن مشكلة، قدم:
1. لقطة شاشة للمشكلة
2. رسائل الخطأ من Console
3. نتيجة `/api/debug/chat-page`
4. متصفح وإصدار النظام الذي تستخدمه
