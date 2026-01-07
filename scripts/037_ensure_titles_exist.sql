-- استبدال السكريبت بسكريبت صحيح يحدث الألقاب بدلاً من الإدراج فقط
-- Insert or update basic titles
INSERT INTO titles (
  key, 
  name_ar, 
  name_en, 
  name_fr,
  description_ar, 
  description_en, 
  description_fr,
  category, 
  icon, 
  color, 
  required_points, 
  required_activities, 
  rarity, 
  is_active, 
  sort_order
)
VALUES
  -- ألقاب المبتدئين (0-100 نقطة)
  ('newcomer', 'وافد جديد', 'Newcomer', 'Nouveau venu', 'أول خطوة في رحلتك', 'Your first step', 'Votre premier pas', 'general', '🌱', '#10b981', 0, '{}', 'common', true, 1),
  ('active_member', 'عضو نشط', 'Active Member', 'Membre Actif', 'أرسلت 50 رسالة', 'Sent 50 messages', 'Envoyé 50 messages', 'communication', '💬', '#3b82f6', 50, '{"messages_sent": 50}', 'common', true, 2),
  ('questioner', 'سائل', 'Questioner', 'Questionneur', 'أجبت على 10 أسئلة', 'Answered 10 questions', 'Répondu à 10 questions', 'communication', '❓', '#8b5cf6', 100, '{"questions_answered": 10}', 'common', true, 3),
  
  -- ألقاب متوسطة (100-500 نقطة)
  ('communicator', 'متواصل', 'Communicator', 'Communicateur', 'أرسلت 100 رسالة', 'Sent 100 messages', 'Envoyé 100 messages', 'communication', '🗣️', '#3b82f6', 150, '{"messages_sent": 100}', 'uncommon', true, 4),
  ('organizer', 'منظم', 'Organizer', 'Organisateur', 'أنشأت 5 عقد', 'Created 5 nodes', 'Créé 5 nœuds', 'leadership', '📋', '#f59e0b', 200, '{"nodes_created": 5}', 'uncommon', true, 5),
  ('voter', 'مصوت', 'Voter', 'Votant', 'صوت على 10 قرارات', 'Voted on 10 decisions', 'Voté sur 10 décisions', 'general', '🗳️', '#6366f1', 100, '{"decisions_voted": 10}', 'uncommon', true, 6),
  
  -- ألقاب متقدمة (500+ نقطة)
  ('leader', 'قائد', 'Leader', 'Leader', 'أنشأت 10 عقد', 'Created 10 nodes', 'Créé 10 nœuds', 'leadership', '👑', '#ef4444', 500, '{"nodes_created": 10}', 'rare', true, 7),
  ('expert_communicator', 'خبير تواصل', 'Expert Communicator', 'Expert en Communication', 'أرسلت 500 رسالة', 'Sent 500 messages', 'Envoyé 500 messages', 'communication', '💎', '#06b6d4', 1000, '{"messages_sent": 500}', 'rare', true, 8),
  ('decision_maker', 'صانع قرار', 'Decision Maker', 'Décideur', 'صوت على 50 قرار', 'Voted on 50 decisions', 'Voté sur 50 décisions', 'general', '⚖️', '#a855f7', 500, '{"decisions_voted": 50}', 'rare', true, 9)
ON CONFLICT (key) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  name_fr = EXCLUDED.name_fr,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  description_fr = EXCLUDED.description_fr,
  required_points = EXCLUDED.required_points,
  required_activities = EXCLUDED.required_activities,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order
  -- removed updated_at = NOW() since titles table doesn't have this column
;
