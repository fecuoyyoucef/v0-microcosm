-- نظام حساب معيار المسؤولية للأفراد والخلايا
-- =============================================

-- 1. إضافة عمود responsibility_score للمستخدمين إن لم يكن موجوداً
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS responsibility_score INTEGER DEFAULT 50 
CHECK (responsibility_score >= 0 AND responsibility_score <= 100);

-- 2. دالة حساب معيار المسؤولية للفرد
CREATE OR REPLACE FUNCTION calculate_user_responsibility(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_score INTEGER := 50; -- نبدأ من 50 كقيمة متوسطة
  messages_count INTEGER;
  tasks_completed INTEGER;
  votes_count INTEGER;
  reactions_given INTEGER;
  days_active INTEGER;
  last_activity TIMESTAMP;
BEGIN
  -- عدد الرسائل في آخر 30 يوم
  SELECT COUNT(*) INTO messages_count
  FROM messages 
  WHERE sender_id = user_uuid 
  AND created_at > NOW() - INTERVAL '30 days';
  
  -- المهام المنجزة
  SELECT COUNT(*) INTO tasks_completed
  FROM extracted_tasks 
  WHERE assigned_to = user_uuid 
  AND status = 'completed';
  
  -- عدد التصويتات
  SELECT COUNT(*) INTO votes_count
  FROM decision_votes 
  WHERE user_id = user_uuid;
  
  -- التفاعلات المعطاة
  SELECT COUNT(*) INTO reactions_given
  FROM message_reactions 
  WHERE user_id = user_uuid
  AND created_at > NOW() - INTERVAL '30 days';
  
  -- آخر نشاط
  SELECT MAX(created_at) INTO last_activity
  FROM messages 
  WHERE sender_id = user_uuid;
  
  -- حساب النقاط
  -- الرسائل: حتى 20 نقطة (1 نقطة لكل 5 رسائل، max 100 رسالة)
  total_score := total_score + LEAST(messages_count / 5, 20);
  
  -- المهام المنجزة: حتى 15 نقطة (3 نقاط لكل مهمة، max 5 مهام)
  total_score := total_score + LEAST(tasks_completed * 3, 15);
  
  -- التصويتات: حتى 10 نقاط (2 نقطة لكل تصويت، max 5 تصويتات)
  total_score := total_score + LEAST(votes_count * 2, 10);
  
  -- التفاعلات: حتى 5 نقاط
  total_score := total_score + LEAST(reactions_given / 2, 5);
  
  -- خصم للغياب الطويل
  IF last_activity IS NOT NULL THEN
    IF last_activity < NOW() - INTERVAL '14 days' THEN
      total_score := total_score - 15;
    ELSIF last_activity < NOW() - INTERVAL '7 days' THEN
      total_score := total_score - 5;
    END IF;
  ELSE
    total_score := total_score - 20; -- لم يرسل أي رسالة
  END IF;
  
  -- التأكد من أن النتيجة بين 0 و 100
  RETURN GREATEST(0, LEAST(100, total_score));
END;
$$ LANGUAGE plpgsql;

-- 3. دالة حساب معيار المسؤولية للخلية
CREATE OR REPLACE FUNCTION calculate_group_responsibility(group_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_score INTEGER := 100; -- نبدأ من 100
  members_count INTEGER;
  active_members INTEGER;
  messages_last_week INTEGER;
  pending_tasks INTEGER;
  completed_tasks INTEGER;
  pending_decisions INTEGER;
  last_message TIMESTAMP;
BEGIN
  -- عدد الأعضاء
  SELECT COUNT(*) INTO members_count
  FROM group_members 
  WHERE group_id = group_uuid;
  
  -- الأعضاء النشطين (أرسلوا رسالة في آخر 7 أيام)
  SELECT COUNT(DISTINCT m.sender_id) INTO active_members
  FROM messages m
  JOIN group_members gm ON gm.user_id = m.sender_id AND gm.group_id = group_uuid
  WHERE m.group_id = group_uuid
  AND m.created_at > NOW() - INTERVAL '7 days';
  
  -- الرسائل في آخر أسبوع
  SELECT COUNT(*) INTO messages_last_week
  FROM messages 
  WHERE group_id = group_uuid 
  AND created_at > NOW() - INTERVAL '7 days';
  
  -- المهام المعلقة
  SELECT COUNT(*) INTO pending_tasks
  FROM extracted_tasks 
  WHERE group_id = group_uuid 
  AND status = 'pending';
  
  -- المهام المنجزة
  SELECT COUNT(*) INTO completed_tasks
  FROM extracted_tasks 
  WHERE group_id = group_uuid 
  AND status = 'completed';
  
  -- القرارات المعلقة
  SELECT COUNT(*) INTO pending_decisions
  FROM decisions 
  WHERE group_id = group_uuid 
  AND status = 'pending';
  
  -- آخر رسالة
  SELECT MAX(created_at) INTO last_message
  FROM messages 
  WHERE group_id = group_uuid;
  
  -- خصم للأعضاء غير النشطين
  IF members_count > 0 THEN
    IF active_members::FLOAT / members_count < 0.3 THEN
      total_score := total_score - 20; -- أقل من 30% نشطين
    ELSIF active_members::FLOAT / members_count < 0.5 THEN
      total_score := total_score - 10; -- أقل من 50% نشطين
    END IF;
  END IF;
  
  -- خصم للمهام المعلقة الكثيرة
  IF pending_tasks > 5 THEN
    total_score := total_score - 15;
  ELSIF pending_tasks > 2 THEN
    total_score := total_score - 5;
  END IF;
  
  -- خصم للقرارات المعلقة
  IF pending_decisions > 3 THEN
    total_score := total_score - 10;
  ELSIF pending_decisions > 1 THEN
    total_score := total_score - 5;
  END IF;
  
  -- خصم للغياب الطويل
  IF last_message IS NOT NULL THEN
    IF last_message < NOW() - INTERVAL '14 days' THEN
      total_score := total_score - 25;
    ELSIF last_message < NOW() - INTERVAL '7 days' THEN
      total_score := total_score - 10;
    END IF;
  END IF;
  
  -- مكافأة للنشاط الجيد
  IF messages_last_week > 50 THEN
    total_score := total_score + 5;
  END IF;
  
  IF completed_tasks > pending_tasks THEN
    total_score := total_score + 5;
  END IF;
  
  RETURN GREATEST(0, LEAST(100, total_score));
END;
$$ LANGUAGE plpgsql;

-- 4. دالة لتحديث جميع معايير المسؤولية
CREATE OR REPLACE FUNCTION update_all_responsibility_scores()
RETURNS void AS $$
BEGIN
  -- تحديث معيار المسؤولية للمستخدمين
  UPDATE profiles
  SET responsibility_score = calculate_user_responsibility(id);
  
  -- تحديث معيار المسؤولية للخلايا
  UPDATE groups
  SET responsibility_score = calculate_group_responsibility(id);
END;
$$ LANGUAGE plpgsql;

-- 5. تشغيل التحديث مرة واحدة
SELECT update_all_responsibility_scores();
