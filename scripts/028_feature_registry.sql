-- إنشاء جدول سجل الميزات
CREATE TABLE IF NOT EXISTS feature_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  feature_name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  category TEXT NOT NULL, -- 'ai', 'core', 'ui', 'admin', 'experimental'
  version TEXT NOT NULL, -- '1.0.0'
  added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_enabled BOOLEAN DEFAULT false,
  requires_admin BOOLEAN DEFAULT false,
  dependencies TEXT[], -- ['ai_features_enabled']
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول تقارير التحسين الأسبوعية
CREATE TABLE IF NOT EXISTS weekly_improvement_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- إحصائيات الأسبوع
  week_stats JSONB NOT NULL, -- {users_active, messages_sent, groups_active, etc.}
  
  -- التحليل والاقتراحات
  insights JSONB NOT NULL, -- [{type: 'warning'|'info'|'success', message: '...', priority: 1-5}]
  
  -- الميزات الجديدة المكتشفة
  new_features JSONB, -- [{feature_key, discovered_at, status: 'pending'|'reviewed'}]
  
  -- توصيات التحسين
  recommendations JSONB NOT NULL, -- [{title, description, impact: 'high'|'medium'|'low', effort: 1-5}]
  
  -- حالة المراجعة
  reviewed_by UUID REFERENCES admins(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  
  UNIQUE(report_date)
);

-- فهارس لتحسين الأداء
CREATE INDEX idx_feature_registry_category ON feature_registry(category);
CREATE INDEX idx_feature_registry_enabled ON feature_registry(is_enabled);
CREATE INDEX idx_weekly_reports_date ON weekly_improvement_reports(report_date DESC);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_feature_registry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feature_registry_timestamp
BEFORE UPDATE ON feature_registry
FOR EACH ROW
EXECUTE FUNCTION update_feature_registry_timestamp();

-- إدخال الميزات الحالية
INSERT INTO feature_registry (feature_key, feature_name, feature_name_ar, description, description_ar, category, version, is_enabled) VALUES
  ('cell_classification_enabled', 'Cell Classification', 'تصنيف الخلايا', 'Categorize cells by type', 'تصنيف الخلايا حسب النوع', 'core', '1.0.0', false),
  ('cell_criteria_enabled', 'Cell Criteria', 'معايير الخلايا', 'Set join requirements for cells', 'تحديد معايير الانضمام للخلايا', 'core', '1.0.0', false),
  ('synaptic_matching_enabled', 'Synaptic Matching', 'المطابقة المشبكية', 'AI-powered cell suggestions', 'اقتراحات الخلايا بالذكاء الاصطناعي', 'ai', '1.2.0', false),
  ('ai_features_enabled', 'AI Features', 'ميزات الذكاء الاصطناعي', 'Enable all AI services', 'تفعيل جميع خدمات الذكاء الاصطناعي', 'ai', '1.0.0', true),
  ('content_moderation_enabled', 'Content Moderation', 'فحص المحتوى', 'Auto-check messages before sending', 'فحص الرسائل تلقائياً قبل الإرسال', 'ai', '1.3.0', true),
  ('semantic_search_enabled', 'Semantic Search', 'البحث الدلالي', 'AI-powered advanced search', 'بحث متقدم بالذكاء الاصطناعي', 'ai', '1.3.0', true),
  ('push_notifications_enabled', 'Push Notifications', 'الإشعارات الفورية', 'Web push notifications', 'إشعارات الويب الفورية', 'core', '1.0.0', true),
  ('animated_backgrounds_enabled', 'Animated Backgrounds', 'الخلفيات المتحركة', 'Neural mesh backgrounds', 'خلفيات الشبكة العصبية', 'ui', '1.1.0', true),
  ('arabic_correction_enabled', 'Arabic Correction', 'تصحيح العربية', 'AI grammar checker for Arabic', 'مصحح نحوي ذكي للعربية', 'ai', '1.4.0', true),
  ('auto_translation_enabled', 'Auto Translation', 'الترجمة التلقائية', 'AI message translation', 'ترجمة الرسائل بالذكاء الاصطناعي', 'ai', '1.4.0', true),
  ('message_classification_enabled', 'Message Classification', 'تصنيف الرسائل', 'Auto-classify and extract tasks', 'تصنيف واستخراج المهام تلقائياً', 'ai', '1.4.0', true),
  ('discussion_quality_enabled', 'Discussion Quality', 'جودة النقاش', 'AI assessment of conversation quality', 'تقييم جودة المحادثات بالذكاء الاصطناعي', 'ai', '1.4.0', true),
  ('smart_recommendations_enabled', 'Smart Recommendations', 'التوصيات الذكية', 'AI content recommendations', 'توصيات المحتوى الذكية', 'ai', '1.4.0', true),
  ('cell_metrics_enabled', 'Cell Metrics', 'مقاييس الخلايا', 'Show cell analytics', 'عرض تحليلات الخلايا', 'core', '1.0.0', false)
ON CONFLICT (feature_key) DO NOTHING;
