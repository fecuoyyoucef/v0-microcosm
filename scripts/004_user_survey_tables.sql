-- جدول الاهتمامات المتاحة
CREATE TABLE IF NOT EXISTS interest_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الاهتمامات الفرعية
CREATE TABLE IF NOT EXISTS interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES interest_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول استبيان المستخدم (سري)
CREATE TABLE IF NOT EXISTS user_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  -- الإجابات على الأسئلة الخمسة
  goal TEXT, -- هدف الانضمام
  skills TEXT, -- المهارات التي يمكن مشاركتها
  best_conversation TEXT, -- أفضل تجربة حوار
  time_wasters TEXT, -- ما يراه مضيعة للوقت
  dream_cell_topic TEXT, -- موضوع الخلية المثالية
  -- البيانات الإضافية
  interests TEXT[] DEFAULT '{}', -- قائمة معرفات الاهتمامات المختارة
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS للاستبيان - كل مستخدم يرى استبيانه فقط
ALTER TABLE user_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own survey"
  ON user_surveys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own survey"
  ON user_surveys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own survey"
  ON user_surveys FOR UPDATE
  USING (auth.uid() = user_id);

-- إدراج فئات الاهتمامات
INSERT INTO interest_categories (name, name_ar, sort_order) VALUES
  ('tech_innovation', 'التقنية والابتكار', 1),
  ('intellectual_academic', 'الفكرية والأكاديمية', 2),
  ('creative_artistic', 'الإبداعية والفنية', 3),
  ('personal_professional', 'التنمية الشخصية والمهنية', 4),
  ('lifestyle_hobbies', 'نمط الحياة والهوايات المتخصصة', 5)
ON CONFLICT DO NOTHING;

-- إدراج الاهتمامات الفرعية
-- التقنية والابتكار
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'ai_ml', 'الذكاء الاصطناعي وتعلم الآلة (AI/ML)', 1 FROM interest_categories WHERE name = 'tech_innovation'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'web_dev', 'تطوير الويب (Frontend/Backend)', 2 FROM interest_categories WHERE name = 'tech_innovation'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'cybersecurity', 'الأمن السيبراني والخصوصية', 3 FROM interest_categories WHERE name = 'tech_innovation'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'blockchain', 'البلوك تشين والعملات المشفرة', 4 FROM interest_categories WHERE name = 'tech_innovation'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'data_science', 'علم البيانات والتحليل الإحصائي', 5 FROM interest_categories WHERE name = 'tech_innovation'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'iot_robotics', 'إنترنت الأشياء (IoT) والروبوتات', 6 FROM interest_categories WHERE name = 'tech_innovation'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'cloud_computing', 'الحوسبة السحابية والبنية التحتية', 7 FROM interest_categories WHERE name = 'tech_innovation'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'mobile_dev', 'تطوير تطبيقات الهاتف المحمول (iOS/Android)', 8 FROM interest_categories WHERE name = 'tech_innovation'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'vr_ar', 'الواقع الافتراضي والمعزز (VR/AR)', 9 FROM interest_categories WHERE name = 'tech_innovation'
ON CONFLICT DO NOTHING;

-- الفكرية والأكاديمية
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'philosophy', 'الفلسفة والمنطق', 1 FROM interest_categories WHERE name = 'intellectual_academic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'psychology', 'علم النفس المعرفي والسلوكي', 2 FROM interest_categories WHERE name = 'intellectual_academic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'history', 'التاريخ والحضارات القديمة', 3 FROM interest_categories WHERE name = 'intellectual_academic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'politics', 'العلوم السياسية والعلاقات الدولية', 4 FROM interest_categories WHERE name = 'intellectual_academic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'economics', 'الاقتصاد والتمويل الشخصي', 5 FROM interest_categories WHERE name = 'intellectual_academic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'linguistics', 'اللغويات والترجمة', 6 FROM interest_categories WHERE name = 'intellectual_academic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'natural_sciences', 'العلوم الطبيعية (الفيزياء، الكيمياء، الأحياء)', 7 FROM interest_categories WHERE name = 'intellectual_academic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'sociology', 'علم الاجتماع والدراسات الثقافية', 8 FROM interest_categories WHERE name = 'intellectual_academic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'literary_criticism', 'النقد الأدبي والمسرحي', 9 FROM interest_categories WHERE name = 'intellectual_academic'
ON CONFLICT DO NOTHING;

-- الإبداعية والفنية
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'literature', 'الأدب والشعر والنقد', 1 FROM interest_categories WHERE name = 'creative_artistic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'photography', 'التصوير الفوتوغرافي والفيديو', 2 FROM interest_categories WHERE name = 'creative_artistic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'ux_ui', 'التصميم الجرافيكي وتجربة المستخدم (UX/UI)', 3 FROM interest_categories WHERE name = 'creative_artistic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'audio_production', 'الإلقاء والإنتاج الصوتي', 4 FROM interest_categories WHERE name = 'creative_artistic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'visual_arts', 'الفنون البصرية والرسم', 5 FROM interest_categories WHERE name = 'creative_artistic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'content_creation', 'صناعة المحتوى والبودكاست', 6 FROM interest_categories WHERE name = 'creative_artistic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'arabic_calligraphy', 'الخط العربي وفنون الزخرفة', 7 FROM interest_categories WHERE name = 'creative_artistic'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'cinema', 'السينما والتحليل الفيلمي', 8 FROM interest_categories WHERE name = 'creative_artistic'
ON CONFLICT DO NOTHING;

-- التنمية الشخصية والمهنية
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'leadership', 'القيادة والإدارة الاستراتيجية', 1 FROM interest_categories WHERE name = 'personal_professional'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'entrepreneurship', 'ريادة الأعمال والشركات الناشئة', 2 FROM interest_categories WHERE name = 'personal_professional'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'mental_health', 'الصحة النفسية واليقظة الذهنية', 3 FROM interest_categories WHERE name = 'personal_professional'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'productivity', 'الإنتاجية وإدارة الوقت', 4 FROM interest_categories WHERE name = 'personal_professional'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'languages', 'تعلم اللغات الأجنبية', 5 FROM interest_categories WHERE name = 'personal_professional'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'soft_skills', 'المهارات الناعمة والتفاوض', 6 FROM interest_categories WHERE name = 'personal_professional'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'financial_planning', 'التخطيط المالي والاستثمار', 7 FROM interest_categories WHERE name = 'personal_professional'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'career_coaching', 'التوجيه المهني وتطوير المسار الوظيفي', 8 FROM interest_categories WHERE name = 'personal_professional'
ON CONFLICT DO NOTHING;

-- نمط الحياة والهوايات المتخصصة
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'cooking', 'الطبخ الاحترافي وفنون المطبخ', 1 FROM interest_categories WHERE name = 'lifestyle_hobbies'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'fitness', 'اللياقة البدنية والتغذية المتقدمة', 2 FROM interest_categories WHERE name = 'lifestyle_hobbies'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'travel', 'السفر والاستكشاف الثقافي', 3 FROM interest_categories WHERE name = 'lifestyle_hobbies'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'gaming', 'الألعاب الاستراتيجية (Gaming Strategy)', 4 FROM interest_categories WHERE name = 'lifestyle_hobbies'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'gardening', 'الزراعة المستدامة والبستنة', 5 FROM interest_categories WHERE name = 'lifestyle_hobbies'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'collecting', 'جمع التحف والهوايات النادرة', 6 FROM interest_categories WHERE name = 'lifestyle_hobbies'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'crafts', 'الحرف اليدوية والـ DIY', 7 FROM interest_categories WHERE name = 'lifestyle_hobbies'
ON CONFLICT DO NOTHING;
INSERT INTO interests (category_id, name, name_ar, sort_order)
SELECT id, 'astronomy', 'علم الفلك ورصد النجوم', 8 FROM interest_categories WHERE name = 'lifestyle_hobbies'
ON CONFLICT DO NOTHING;

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_user_surveys_user_id ON user_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_interests_category_id ON interests(category_id);
