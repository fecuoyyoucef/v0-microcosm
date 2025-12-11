-- Admin tables for owner dashboard
-- جداول Admin للوحة تحكم المالك

-- جدول المشرفين
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  display_name text,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

-- جدول سجل أنشطة Admin
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

-- جدول ملاحظات التطوير
CREATE TABLE IF NOT EXISTS dev_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) ON DELETE SET NULL,
  content text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- جدول إشعارات النظام (للإرسال الجماعي)
CREATE TABLE IF NOT EXISTS system_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text,
  target text DEFAULT 'all' CHECK (target IN ('all', 'android', 'ios', 'web')),
  priority text DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  action_url text,
  action_label text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  recipients_count integer DEFAULT 0
);

-- إنشاء حساب super_admin بكلمة مرور نص عادي (سيتم التحقق منها في الكود)
INSERT INTO admins (email, password_hash, role, display_name)
VALUES (
  'youcef192837@gmail.com',
  'F1E2C3U4O5Y6',
  'super_admin',
  'Youcef'
) ON CONFLICT (email) DO UPDATE SET 
  password_hash = 'F1E2C3U4O5Y6',
  display_name = 'Youcef';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dev_notes_status ON dev_notes(status);
CREATE INDEX IF NOT EXISTS idx_system_announcements_sent ON system_announcements(sent_at DESC);
