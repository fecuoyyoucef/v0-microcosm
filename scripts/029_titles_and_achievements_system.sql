-- نظام الألقاب والإنجازات الكامل
-- System for Titles, Achievements, and Activity Tracking

-- 1. جدول الألقاب المتاحة (Available Titles)
CREATE TABLE IF NOT EXISTS titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- مثل: "organizer", "analyst", "initiator"
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  description_fr TEXT,
  category TEXT NOT NULL, -- leadership, analysis, initiative, communication, wisdom
  icon TEXT, -- emoji أو icon name
  color TEXT, -- لون اللقب للعرض
  required_points INTEGER DEFAULT 0,
  required_activities JSONB, -- الأنشطة المطلوبة لتحصيل اللقب
  rarity TEXT DEFAULT 'common', -- common, uncommon, rare, epic, legendary
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول ألقاب المستخدمين (User Titles)
CREATE TABLE IF NOT EXISTS user_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_visible BOOLEAN DEFAULT TRUE, -- يمكن للمستخدم إخفاء الألقاب
  progress_data JSONB, -- بيانات تقدم المستخدم نحو اللقب
  UNIQUE(user_id, title_id)
);

-- 3. جدول تتبع النشاط (Activity Tracking)
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- message_sent, node_created, decision_voted, etc.
  activity_category TEXT, -- leadership, analysis, communication, etc.
  points_earned INTEGER DEFAULT 0,
  metadata JSONB, -- معلومات إضافية عن النشاط
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_group ON user_activity_log(group_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_titles_user ON user_titles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_titles_title ON user_titles(title_id);

-- 4. جدول إحصائيات المستخدم (User Stats Summary)
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  
  -- Leadership stats
  nodes_created INTEGER DEFAULT 0,
  subgroups_created INTEGER DEFAULT 0,
  discussions_moderated INTEGER DEFAULT 0,
  
  -- Analysis stats
  focused_messages INTEGER DEFAULT 0,
  summaries_created INTEGER DEFAULT 0,
  problems_solved INTEGER DEFAULT 0,
  
  -- Initiative stats
  new_topics_started INTEGER DEFAULT 0,
  valuable_nodes_created INTEGER DEFAULT 0,
  
  -- Communication stats
  questions_answered INTEGER DEFAULT 0,
  members_helped INTEGER DEFAULT 0,
  responses_count INTEGER DEFAULT 0,
  
  -- Wisdom stats
  conflicts_resolved INTEGER DEFAULT 0,
  rational_interventions INTEGER DEFAULT 0,
  
  -- Additional metrics
  decisions_voted INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  avg_message_quality NUMERIC DEFAULT 0,
  consistency_score INTEGER DEFAULT 0, -- مقياس الانتظام
  
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. تحديث profiles لإضافة active_title_id
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS active_title_id UUID REFERENCES titles(id),
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS responsibility_score INTEGER DEFAULT 0;

-- 6. إدخال الألقاب الأساسية
INSERT INTO titles (key, name_ar, name_en, name_fr, description_ar, description_en, description_fr, category, icon, color, required_points, required_activities, rarity) VALUES

-- ألقاب القيادة
('organizer', 'المنظِّم', 'The Organizer', 'L''Organisateur', 'يحافظ على النظام وينسق الأنشطة', 'Maintains order and coordinates activities', 'Maintient l''ordre et coordonne les activités', 'leadership', '📋', '#3b82f6', 500, '{"nodes_created": 5, "discussions_moderated": 3}', 'common'),
('leader', 'القائد', 'The Leader', 'Le Leader', 'يقود المجموعة بحكمة', 'Leads the group wisely', 'Dirige le groupe avec sagesse', 'leadership', '👑', '#8b5cf6', 1000, '{"nodes_created": 10, "discussions_moderated": 5}', 'uncommon'),
('node_coordinator', 'منسّق العقد', 'Node Coordinator', 'Coordinateur de Nœuds', 'متخصص في تنظيم العقد وربطها', 'Specializes in organizing and linking nodes', 'Spécialisé dans l''organisation des nœuds', 'leadership', '🔗', '#06b6d4', 800, '{"nodes_created": 8}', 'uncommon'),
('dialogue_manager', 'مدير الحوار', 'Dialogue Manager', 'Gestionnaire de Dialogue', 'يدير النقاشات بفعالية', 'Manages discussions effectively', 'Gère les discussions efficacement', 'leadership', '💬', '#10b981', 700, '{"discussions_moderated": 10}', 'common'),
('observer', 'الراصد', 'The Observer', 'L''Observateur', 'يراقب ويربط المواضيع', 'Monitors and connects topics', 'Surveille et relie les sujets', 'leadership', '👁️', '#6366f1', 600, '{"topics_linked": 5}', 'common'),

-- ألقاب التحليل
('analyst', 'المحلِّل', 'The Analyst', 'L''Analyste', 'يحلل الأفكار بعمق', 'Analyzes ideas deeply', 'Analyse les idées en profondeur', 'analysis', '🔍', '#f59e0b', 600, '{"focused_messages": 20}', 'common'),
('researcher', 'الباحث', 'The Researcher', 'Le Chercheur', 'يبحث ويستكشف', 'Researches and explores', 'Recherche et explore', 'analysis', '📚', '#8b5cf6', 800, '{"focused_messages": 30, "problems_solved": 5}', 'uncommon'),
('explorer', 'المستكشف', 'The Explorer', 'L''Explorateur', 'يستكشف أفكارًا جديدة', 'Explores new ideas', 'Explore de nouvelles idées', 'analysis', '🧭', '#06b6d4', 500, '{"new_topics_started": 5}', 'common'),
('documenter', 'الموثّق', 'The Documenter', 'Le Documenteur', 'يوثق المعرفة بدقة', 'Documents knowledge precisely', 'Documente les connaissances précisément', 'analysis', '📝', '#10b981', 700, '{"summaries_created": 5}', 'uncommon'),
('thinker', 'المفكّر', 'The Thinker', 'Le Penseur', 'مفكر عميق', 'Deep thinker', 'Penseur profond', 'analysis', '🤔', '#ec4899', 900, '{"focused_messages": 40, "problems_solved": 8}', 'rare'),

-- ألقاب المبادرة
('initiator', 'المبادر', 'The Initiator', 'L''Initiateur', 'يبدأ المواضيع الجديدة', 'Starts new topics', 'Lance de nouveaux sujets', 'initiative', '⚡', '#eab308', 400, '{"new_topics_started": 3}', 'common'),
('pathmaker', 'صانع المسار', 'The Pathmaker', 'Le Créateur de Chemin', 'يفتح مسارات جديدة', 'Opens new paths', 'Ouvre de nouveaux chemins', 'initiative', '🛤️', '#f97316', 800, '{"new_topics_started": 8, "valuable_nodes_created": 5}', 'uncommon'),
('node_founder', 'مؤسس العقدة', 'Node Founder', 'Fondateur de Nœud', 'ينشئ عقدًا ذات قيمة', 'Creates valuable nodes', 'Crée des nœuds précieux', 'initiative', '🌱', '#84cc16', 600, '{"nodes_created": 5}', 'common'),
('discussion_catalyst', 'محفّز النقاش', 'Discussion Catalyst', 'Catalyseur de Discussion', 'يحفز النقاشات القيمة', 'Catalyzes valuable discussions', 'Catalyse des discussions précieuses', 'initiative', '💡', '#22c55e', 700, '{"new_topics_started": 10}', 'uncommon'),

-- ألقاب التواصل
('speaker', 'المتحدث', 'The Speaker', 'L''Orateur', 'متحدث فعال', 'Effective speaker', 'Orateur efficace', 'communication', '🎤', '#3b82f6', 500, '{"responses_count": 30}', 'common'),
('conversation_engineer', 'مهندس الحوار', 'Conversation Engineer', 'Ingénieur de Conversation', 'يبني حوارات بناءة', 'Builds constructive dialogues', 'Construit des dialogues constructifs', 'communication', '🏗️', '#8b5cf6', 900, '{"responses_count": 50, "members_helped": 10}', 'rare'),
('bridge', 'جسر التواصل', 'The Bridge', 'Le Pont', 'يربط الأفكار والأشخاص', 'Connects ideas and people', 'Relie les idées et les gens', 'communication', '🌉', '#06b6d4', 700, '{"members_helped": 8}', 'uncommon'),
('helper', 'المساعد', 'The Helper', 'L''Assistant', 'يساعد الآخرين', 'Helps others', 'Aide les autres', 'communication', '🤝', '#10b981', 400, '{"questions_answered": 5}', 'common'),
('supporter', 'الداعم', 'The Supporter', 'Le Supporteur', 'يدعم المجتمع', 'Supports the community', 'Soutient la communauté', 'communication', '💪', '#14b8a6', 600, '{"members_helped": 10}', 'common'),

-- ألقاب الحكمة
('balancer', 'الموازن', 'The Balancer', 'L''Équilibreur', 'يوازن النقاشات', 'Balances discussions', 'Équilibre les discussions', 'wisdom', '⚖️', '#6366f1', 800, '{"conflicts_resolved": 3}', 'uncommon'),
('sage', 'الحكيم', 'The Sage', 'Le Sage', 'حكيم وعاقل', 'Wise and rational', 'Sage et rationnel', 'wisdom', '🧙', '#a855f7', 1200, '{"conflicts_resolved": 8, "rational_interventions": 10}', 'rare'),
('peacemaker', 'مُصلح النزاعات', 'The Peacemaker', 'Le Pacificateur', 'يحل النزاعات بحكمة', 'Resolves conflicts wisely', 'Résout les conflits avec sagesse', 'wisdom', '☮️', '#ec4899', 1000, '{"conflicts_resolved": 5}', 'uncommon'),
('calm_maker', 'صانع الهدوء', 'Calm Maker', 'Créateur de Calme', 'يجلب الهدوء', 'Brings calmness', 'Apporte le calme', 'wisdom', '🕊️', '#14b8a6', 700, '{"conflicts_resolved": 3}', 'common'),
('wise_observer', 'المراقب الحصيف', 'Wise Observer', 'Observateur Sage', 'مراقب حكيم', 'Wise observer', 'Observateur sage', 'wisdom', '🦉', '#7c3aed', 900, '{"rational_interventions": 8}', 'uncommon');

-- 7. RLS Policies
ALTER TABLE titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- الجميع يمكنهم قراءة الألقاب
CREATE POLICY "Anyone can read titles" ON titles FOR SELECT USING (true);

-- المستخدمون يمكنهم قراءة ألقابهم الخاصة
CREATE POLICY "Users can view own titles" ON user_titles FOR SELECT 
USING (auth.uid() = user_id);

-- الجميع يمكنهم رؤية الألقاب المرئية للآخرين
CREATE POLICY "Anyone can view visible titles" ON user_titles FOR SELECT 
USING (is_visible = true);

-- المستخدمون يمكنهم تحديث رؤية ألقابهم
CREATE POLICY "Users can update own title visibility" ON user_titles FOR UPDATE 
USING (auth.uid() = user_id);

-- النظام يمكنه إضافة ألقاب
CREATE POLICY "System can insert titles" ON user_titles FOR INSERT 
WITH CHECK (true);

-- المستخدمون يمكنهم قراءة نشاطهم
CREATE POLICY "Users can view own activity" ON user_activity_log FOR SELECT 
USING (auth.uid() = user_id);

-- النظام يمكنه تسجيل النشاط
CREATE POLICY "System can log activity" ON user_activity_log FOR INSERT 
WITH CHECK (true);

-- المستخدمون يمكنهم قراءة إحصائياتهم
CREATE POLICY "Users can view own stats" ON user_stats FOR SELECT 
USING (auth.uid() = user_id);

-- الجميع يمكنهم رؤية إحصائيات الآخرين (للترتيب)
CREATE POLICY "Anyone can view user stats" ON user_stats FOR SELECT 
USING (true);

-- النظام يمكنه تحديث الإحصائيات
CREATE POLICY "System can manage stats" ON user_stats FOR ALL 
USING (true);

-- 8. دالة لحساب النقاط تلقائياً
CREATE OR REPLACE FUNCTION calculate_user_points()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث إجمالي النقاط
  UPDATE user_stats
  SET 
    total_points = total_points + NEW.points_earned,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  -- إنشاء سجل إحصائيات إذا لم يكن موجودًا
  INSERT INTO user_stats (user_id, total_points)
  VALUES (NEW.user_id, NEW.points_earned)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_points = user_stats.total_points + NEW.points_earned,
    updated_at = NOW();
    
  -- تحديث profiles
  UPDATE profiles
  SET 
    total_points = COALESCE(total_points, 0) + NEW.points_earned
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger لحساب النقاط تلقائياً
DROP TRIGGER IF EXISTS trigger_calculate_points ON user_activity_log;
CREATE TRIGGER trigger_calculate_points
AFTER INSERT ON user_activity_log
FOR EACH ROW
EXECUTE FUNCTION calculate_user_points();

-- 9. دالة لمنح الألقاب تلقائياً
CREATE OR REPLACE FUNCTION award_titles_automatically()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  title_record RECORD;
  requirements JSONB;
  can_award BOOLEAN;
BEGIN
  -- حلقة على جميع المستخدمين
  FOR user_record IN 
    SELECT id, total_points FROM user_stats
  LOOP
    -- حلقة على جميع الألقاب
    FOR title_record IN 
      SELECT * FROM titles WHERE is_active = true
    LOOP
      -- التحقق إذا كان المستخدم لديه اللقب بالفعل
      IF NOT EXISTS (
        SELECT 1 FROM user_titles 
        WHERE user_id = user_record.id AND title_id = title_record.id
      ) THEN
        can_award := true;
        requirements := title_record.required_activities;
        
        -- التحقق من المتطلبات
        IF requirements IS NOT NULL THEN
          -- هنا يمكن إضافة منطق معقد للتحقق من المتطلبات
          -- مثال بسيط: التحقق من النقاط فقط
          IF user_record.total_points < title_record.required_points THEN
            can_award := false;
          END IF;
        END IF;
        
        -- منح اللقب
        IF can_award AND user_record.total_points >= title_record.required_points THEN
          INSERT INTO user_titles (user_id, title_id, earned_at)
          VALUES (user_record.id, title_record.id, NOW())
          ON CONFLICT (user_id, title_id) DO NOTHING;
          
          -- إنشاء إشعار للمستخدم
          INSERT INTO notifications (
            user_id, 
            type, 
            title, 
            body,
            data
          ) VALUES (
            user_record.id,
            'title_earned',
            'لقب جديد! 🎉',
            'تهانينا! لقد حصلت على لقب: ' || title_record.name_ar,
            jsonb_build_object('title_id', title_record.id, 'title_name', title_record.name_ar)
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
