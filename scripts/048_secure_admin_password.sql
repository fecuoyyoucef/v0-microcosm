-- ترقية أمني: إضافة عمود salt لجدول admins
-- وتحديث كلمة مرور الأدمن إلى hash مشفر

-- إضافة عمود salt إذا لم يكن موجوداً
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS salt text;

-- تحديث كلمة مرور المالك بـ hash مشفر
-- Hash الآتي تم توليده بواسطة: SHA256(salt + "F1E2C3U4O5Y6")
-- salt: synaptic_space_admin_salt_2024
-- يمكنك تغيير كلمة المرور لاحقاً من /admin/settings
UPDATE admins
SET 
  password_hash = 'a3f8c2d1e6b9047352a1c4d87f6e3b20c9a5d8e1f2b4c7a0d3e6f9b2c5a8d1e4',
  salt = 'synaptic_space_admin_salt_2024'
WHERE email = 'youcef192837@gmail.com';

-- ملاحظة: هذا الـ hash هو مثال فقط.
-- شغّل scripts/hash-admin-password.mjs للحصول على الـ hash الحقيقي
-- ثم استبدل القيمة أعلاه بالقيمة الصحيحة.
