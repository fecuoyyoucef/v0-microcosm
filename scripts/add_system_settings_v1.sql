-- إعدادات النظام العامة
-- System Settings for feature flags and configuration

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_by uuid REFERENCES admins(id) ON DELETE SET NULL,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- إدخال الإعدادات الافتراضية
INSERT INTO system_settings (key, value, description) VALUES
  ('cell_classification_enabled', 'false', 'تفعيل نظام تصنيف الخلايا (مشروع/حوار)'),
  ('cell_metrics_enabled', 'false', 'تفعيل نظام معايير المسؤولية والتقدم'),
  ('ai_features_enabled', 'true', 'تفعيل ميزات الذكاء الاصطناعي'),
  ('max_group_members', '100', 'الحد الأقصى لأعضاء الخلية'),
  ('maintenance_mode', 'false', 'وضع الصيانة')
ON CONFLICT (key) DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
