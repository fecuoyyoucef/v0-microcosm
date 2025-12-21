-- حذف التوكنات القديمة (أكثر من 24 ساعة بدون تحديث)
DELETE FROM fcm_tokens 
WHERE updated_at < NOW() - INTERVAL '24 hours';

-- عرض التوكنات المتبقية
SELECT 
  user_id,
  LEFT(token, 30) as token_preview,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 as hours_old
FROM fcm_tokens 
ORDER BY updated_at DESC;
