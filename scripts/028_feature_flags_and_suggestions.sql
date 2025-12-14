-- نظام Feature Flags المتقدم + نظام الاقتراحات الأسبوعية

-- جدول الميزات (Feature Flags)
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,
  feature_name_ar TEXT NOT NULL,
  feature_name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  category TEXT NOT NULL DEFAULT 'core', -- ai, core, ui, experimental
  is_enabled BOOLEAN DEFAULT false,
  version TEXT NOT NULL DEFAULT '1.0.0',
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- معلومات إضافية
  dependencies JSONB DEFAULT '[]', -- ميزات أخرى تعتمد عليها
  rollout_percentage INTEGER DEFAULT 100, -- للـ A/B testing
  scheduled_enable_at TIMESTAMP,
  scheduled_disable_at TIMESTAMP,
  
  -- تتبع الاستخدام
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  error_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- جدول سجل تغييرات الميزات
CREATE TABLE IF NOT EXISTS feature_flag_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL REFERENCES feature_flags(feature_key) ON DELETE CASCADE,
  action TEXT NOT NULL, -- enabled, disabled, updated, rolled_back
  previous_state JSONB,
  new_state JSONB,
  changed_by TEXT, -- 'admin' or 'system'
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- جدول الاقتراحات الأسبوعية
CREATE TABLE IF NOT EXISTS weekly_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  
  -- البيانات المجمعة
  total_users INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_groups INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- الاقتراحات (من AI)
  suggestions JSONB DEFAULT '[]', -- [{type, title, description, priority, category}]
  
  -- التحليلات
  performance_issues JSONB DEFAULT '[]',
  unused_features JSONB DEFAULT '[]',
  popular_features JSONB DEFAULT '[]',
  user_feedback_summary TEXT,
  
  -- الحالة
  status TEXT DEFAULT 'pending', -- pending, reviewed, implemented
  admin_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  
  UNIQUE(week_start_date)
);

-- جدول قرارات المالك على الاقتراحات
CREATE TABLE IF NOT EXISTS suggestion_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID REFERENCES weekly_suggestions(id) ON DELETE CASCADE,
  suggestion_index INTEGER NOT NULL, -- index في array الاقتراحات
  decision TEXT NOT NULL, -- accepted, rejected, deferred
  reason TEXT,
  implemented_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- جدول تتبع استخدام الميزات
CREATE TABLE IF NOT EXISTS feature_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL,
  user_id UUID,
  action TEXT, -- viewed, clicked, used, error
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flag_history_key ON feature_flag_history(feature_key);
CREATE INDEX IF NOT EXISTS idx_weekly_suggestions_status ON weekly_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_feature_usage_logs_key ON feature_usage_logs(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_usage_logs_created ON feature_usage_logs(created_at);

-- RLS Policies
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage_logs ENABLE ROW LEVEL SECURITY;

-- السماح بالقراءة للجميع (للتحقق من تفعيل الميزات)
CREATE POLICY "Anyone can read feature flags" ON feature_flags FOR SELECT USING (true);

-- الكتابة فقط من خلال service role (من لوحة التحكم)
CREATE POLICY "Service role can manage feature flags" ON feature_flags FOR ALL USING (true);
CREATE POLICY "Service role can manage history" ON feature_flag_history FOR ALL USING (true);
CREATE POLICY "Service role can manage suggestions" ON weekly_suggestions FOR ALL USING (true);
CREATE POLICY "Service role can manage decisions" ON suggestion_decisions FOR ALL USING (true);

-- السماح للمستخدمين بتسجيل الاستخدام
CREATE POLICY "Users can log feature usage" ON feature_usage_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Service role can read usage logs" ON feature_usage_logs FOR SELECT USING (true);

-- إدراج الميزات الأساسية الموجودة
INSERT INTO feature_flags (feature_key, feature_name_ar, feature_name_en, description_ar, category, is_enabled, version) VALUES
-- ميزات AI
('ai_chat_assistant', 'المساعد الذكي', 'AI Chat Assistant', 'مساعد ذكي للإجابة على الأسئلة', 'ai', true, '1.0.0'),
('ai_content_moderation', 'فحص المحتوى', 'Content Moderation', 'فحص تلقائي للمحتوى غير اللائق', 'ai', true, '1.0.0'),
('ai_message_classification', 'تصنيف الرسائل', 'Message Classification', 'تصنيف تلقائي للرسائل واستخراج المهام', 'ai', true, '1.0.0'),
('ai_arabic_correction', 'تصحيح اللغة العربية', 'Arabic Correction', 'تصحيح تلقائي للأخطاء النحوية', 'ai', true, '1.0.0'),
('ai_translation', 'الترجمة التلقائية', 'Auto Translation', 'ترجمة فورية بين العربية والإنجليزية', 'ai', true, '1.0.0'),
('ai_semantic_search', 'البحث الدلالي', 'Semantic Search', 'بحث ذكي بالمعنى', 'ai', true, '1.0.0'),
('ai_suggest_members', 'اقتراح أعضاء', 'Member Suggestions', 'اقتراح أعضاء للخلايا', 'ai', true, '1.0.0'),
('ai_discussion_questions', 'أسئلة النقاش', 'Discussion Questions', 'توليد أسئلة لتحفيز النقاش', 'ai', true, '1.0.0'),
('ai_node_title_generation', 'توليد عناوين العقد', 'Node Title Generation', 'توليد عناوين تلقائية للعقد', 'ai', true, '1.0.0'),
('ai_similar_topics', 'اكتشاف المواضيع المتشابهة', 'Similar Topics Detection', 'اكتشاف تشابهات المواضيع', 'ai', true, '1.0.0'),
('ai_quality_assessment', 'تقييم جودة النقاش', 'Quality Assessment', 'تقييم جودة المحادثات', 'ai', true, '1.0.0'),
('ai_enhanced_matching', 'المطابقة المحسنة', 'Enhanced Matching', 'مطابقة ذكية للخلايا', 'ai', true, '1.0.0'),
('ai_content_recommendations', 'توصيات المحتوى', 'Content Recommendations', 'اقتراحات ذكية للمحتوى', 'ai', true, '1.0.0'),

-- الميزات الأساسية
('cell_classification', 'تصنيف الخلايا', 'Cell Classification', 'نظام تصنيف الخلايا حسب النوع', 'core', true, '1.0.0'),
('synaptic_matching', 'المطابقة المشبكية', 'Synaptic Matching', 'نظام مطابقة ذكي للخلايا والأعضاء', 'core', true, '1.0.0'),
('web_push_notifications', 'إشعارات الويب', 'Web Push Notifications', 'إشعارات فورية عبر المتصفح', 'core', true, '1.0.0'),
('collective_memory', 'الذاكرة الجماعية', 'Collective Memory', 'نظام حفظ وتنظيم الذكريات', 'core', true, '1.0.0'),
('decisions_system', 'نظام القرارات', 'Decisions System', 'تتبع وإدارة القرارات', 'core', true, '1.0.0'),
('notebook_system', 'نظام الدفتر', 'Notebook System', 'دفتر ملاحظات متقدم', 'core', true, '1.0.0'),

-- ميزات الواجهة
('dark_mode', 'الوضع الداكن', 'Dark Mode', 'واجهة داكنة مريحة للعين', 'ui', true, '1.0.0'),
('animated_backgrounds', 'الخلفيات المتحركة', 'Animated Backgrounds', 'خلفيات تفاعلية متحركة', 'ui', true, '1.0.0'),
('conversation_map', 'خريطة المحادثة', 'Conversation Map', 'عرض مرئي للمحادثات', 'ui', true, '1.0.0')

ON CONFLICT (feature_key) DO NOTHING;

-- Function لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_feature_flag_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flag_updated_at();
