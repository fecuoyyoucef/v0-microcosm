-- إضافة حقل النبذة الشخصية للملفات الشخصية
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- إنشاء bucket للصور الشخصية إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- سياسة للسماح بالرفع للمستخدمين المسجلين
CREATE POLICY "Avatar upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- سياسة للسماح بالقراءة للجميع
CREATE POLICY "Avatar public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- سياسة للسماح بالتحديث للمالك
CREATE POLICY "Avatar update own" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
