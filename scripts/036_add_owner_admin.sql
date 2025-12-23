-- إضافة حساب المالك كـ super_admin
INSERT INTO admins (email, display_name, password_hash, role, is_active, created_at)
VALUES (
  'youcef192837@gmail.com',
  'Youcef (Owner)',
  'super_admin_bypass', -- سيتم التحقق من الجلسة بدلاً من كلمة المرور
  'super_admin',
  true,
  NOW()
)
ON CONFLICT (email) DO UPDATE SET 
  is_active = true,
  role = 'super_admin';
