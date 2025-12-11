-- إنشاء bucket للصور الشخصية
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- إنشاء bucket لصور المجموعات
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-avatars', 'group-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- إنشاء bucket لمرفقات الرسائل
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- سياسات الوصول للصور الشخصية
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- سياسات الوصول لصور المجموعات
CREATE POLICY "Group avatars are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'group-avatars');

CREATE POLICY "Group admins can upload group avatar" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'group-avatars');

CREATE POLICY "Group admins can update group avatar" ON storage.objects
FOR UPDATE USING (bucket_id = 'group-avatars');

CREATE POLICY "Group admins can delete group avatar" ON storage.objects
FOR DELETE USING (bucket_id = 'group-avatars');

-- سياسات الوصول لمرفقات الرسائل
CREATE POLICY "Message attachments are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'message-attachments');

CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'message-attachments' 
  AND auth.role() = 'authenticated'
);
