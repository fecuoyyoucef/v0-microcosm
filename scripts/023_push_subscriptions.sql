-- Create push subscriptions table for Web Push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "push_subscriptions_select_own" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_insert_own" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_update_own" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_delete_own" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Create system_announcements table if not exists
CREATE TABLE IF NOT EXISTS system_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id),
  title TEXT NOT NULL,
  body TEXT,
  target TEXT DEFAULT 'all',
  priority TEXT DEFAULT 'normal',
  action_url TEXT,
  action_label TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recipients_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on system_announcements
ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;

-- Only admins can manage announcements
CREATE POLICY "system_announcements_admin" ON system_announcements
  FOR ALL USING (true);
