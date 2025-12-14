-- إضافة دالة لتحديث إحصائيات المستخدم
CREATE OR REPLACE FUNCTION update_user_stats(
  p_user_id UUID,
  p_updates TEXT
)
RETURNS void AS $$
BEGIN
  -- تحديث الإحصائيات
  EXECUTE format(
    'INSERT INTO user_stats (user_id, updated_at) VALUES ($1, NOW())
     ON CONFLICT (user_id) DO UPDATE SET %s, updated_at = NOW()',
    p_updates
  ) USING p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تأكد من وجود records للمستخدمين الحاليين
INSERT INTO user_stats (user_id, total_points)
SELECT id, 0 FROM profiles
ON CONFLICT (user_id) DO NOTHING;
