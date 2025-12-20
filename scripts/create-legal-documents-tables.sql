-- Create legal documents table to store privacy policy and terms of service
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('privacy_policy', 'terms_of_service')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(document_type, version)
);

-- Create user consents table to track user agreements
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  privacy_policy_version INTEGER NOT NULL,
  terms_of_service_version INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  consented_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, privacy_policy_version, terms_of_service_version)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_legal_documents_type ON legal_documents(document_type, is_active);
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);

-- Enable RLS
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Updated RLS policies to check admin role properly
-- RLS Policies for legal_documents (everyone can read active documents)
CREATE POLICY "Anyone can view active legal documents"
  ON legal_documents FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can insert legal documents"
  ON legal_documents FOR INSERT
  WITH CHECK (
    (SELECT admins.id FROM public.admins WHERE admins.id = auth.uid() AND admins.is_active = true) IS NOT NULL
  );

CREATE POLICY "Only admins can update legal documents"
  ON legal_documents FOR UPDATE
  USING (
    (SELECT admins.id FROM public.admins WHERE admins.id = auth.uid() AND admins.is_active = true) IS NOT NULL
  );

-- RLS Policies for user_consents
CREATE POLICY "Users can view their own consents"
  ON user_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consents"
  ON user_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Insert default privacy policy
INSERT INTO legal_documents (document_type, title, content, version, is_active)
VALUES (
  'privacy_policy',
  'سياسة الخصوصية',
  '# سياسة الخصوصية

## مقدمة
نحن في Synaptic Space نلتزم بحماية خصوصيتك وبياناتك الشخصية. توضح هذه السياسة كيفية جمعنا واستخدامنا وحماية معلوماتك.

## المعلومات التي نجمعها
### معلومات الحساب
- الاسم الكامل
- عنوان البريد الإلكتروني
- كلمة المرور (مشفرة)
- صورة الملف الشخصي (اختيارية)

### معلومات الاستخدام
- الرسائل والمحادثات
- القرارات والتصويتات
- المهام والملاحظات
- سجلات النشاط

## كيفية استخدام المعلومات
نستخدم معلوماتك من أجل:
- توفير وتحسين خدماتنا
- التواصل معك بشأن حسابك
- تخصيص تجربتك
- ضمان أمان المنصة

## حماية البيانات
نتخذ إجراءات أمنية متقدمة لحماية بياناتك:
- تشفير البيانات في حالة النقل والتخزين
- مصادقة ثنائية العامل
- نسخ احتياطي منتظم
- مراقبة أمنية على مدار الساعة

## مشاركة البيانات
لا نبيع أو نشارك بياناتك الشخصية مع أطراف ثالثة إلا في الحالات التالية:
- بموافقتك الصريحة
- للامتثال للقانون
- لحماية حقوقنا أو سلامة المستخدمين

## حقوقك
لديك الحق في:
- الوصول إلى بياناتك الشخصية
- تصحيح أو تحديث بياناتك
- حذف حسابك وبياناتك
- تصدير بياناتك
- الاعتراض على معالجة بياناتك

## الاتصال بنا
إذا كانت لديك أي أسئلة حول سياسة الخصوصية، يرجى الاتصال بنا عبر البريد الإلكتروني.

آخر تحديث: ' || CURRENT_DATE || '
',
  1,
  true
) ON CONFLICT DO NOTHING;

-- Insert default terms of service
INSERT INTO legal_documents (document_type, title, content, version, is_active)
VALUES (
  'terms_of_service',
  'شروط الاستخدام',
  '# شروط الاستخدام

## قبول الشروط
باستخدامك لـ Synaptic Space، فإنك توافق على الالتزام بهذه الشروط والأحكام.

## استخدام الخدمة
### يُسمح لك بـ:
- إنشاء حساب شخصي
- المشاركة في المجموعات والمحادثات
- استخدام جميع الميزات المتاحة
- دعوة أعضاء جدد

### يُحظر عليك:
- مشاركة محتوى غير قانوني أو ضار
- انتحال شخصية الآخرين
- محاولة اختراق أو تعطيل النظام
- إرسال بريد مزعج أو محتوى تجاري غير مرغوب فيه
- استخدام الخدمة لأغراض غير قانونية

## الملكية الفكرية
- جميع حقوق المنصة والتصميم محفوظة
- أنت تحتفظ بحقوق المحتوى الذي تنشره
- تمنحنا ترخيصاً لعرض وتخزين محتواك

## إنهاء الحساب
يمكننا تعليق أو إنهاء حسابك في حالة:
- انتهاك هذه الشروط
- نشاط احتيالي أو ضار
- طلبك حذف الحساب

## إخلاء المسؤولية
- نقدم الخدمة "كما هي" دون ضمانات
- لسنا مسؤولين عن المحتوى الذي ينشره المستخدمون
- لسنا مسؤولين عن فقدان البيانات (مع توفر النسخ الاحتياطي)

## التغييرات على الشروط
نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سنقوم بإشعارك بأي تغييرات مهمة.

## القانون الواجب التطبيق
تخضع هذه الشروط للقوانين المعمول بها في الدولة التي نعمل فيها.

## الاتصال بنا
إذا كانت لديك أي أسئلة حول شروط الاستخدام، يرجى الاتصال بنا.

آخر تحديث: ' || CURRENT_DATE || '
',
  1,
  true
) ON CONFLICT DO NOTHING;
