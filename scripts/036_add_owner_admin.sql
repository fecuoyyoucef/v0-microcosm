-- إضافة حساب المالك كـ super_admin
-- password_hash يجب أن يُعيَّن لاحقاً عبر /admin/settings أو عبر الـ API
-- لا تُخزَّن كلمات المرور كنص عادي هنا أبداً
INSERT INTO admins (email, display_name, password_hash, role, is_active, created_at)
VALUES (
  'youcef192837@gmail.com',
  'Youcef (Owner)',
  'CHANGE_ME_USE_HASHED_PASSWORD', -- يجب تغيير هذا فور التشغيل عبر /admin/settings
  'super_admin',
  true,
  NOW()
)
ON CONFLICT (email) DO UPDATE SET 
  is_active = true,
  role = 'super_admin';
