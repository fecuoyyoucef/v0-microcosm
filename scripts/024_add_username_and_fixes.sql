-- Add username column for profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Update max_members default to 15
ALTER TABLE groups ALTER COLUMN max_members SET DEFAULT 15;

-- Update existing groups to have max_members = 15 if they have default 10
UPDATE groups SET max_members = 15 WHERE max_members = 10;

-- Add unread_count tracking
CREATE TABLE IF NOT EXISTS group_unread_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE group_unread_counts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "unread_counts_select" ON group_unread_counts
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "unread_counts_upsert" ON group_unread_counts
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "unread_counts_update" ON group_unread_counts
FOR UPDATE USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE group_unread_counts;

-- Function to increment unread count when new message arrives
CREATE OR REPLACE FUNCTION increment_unread_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment unread count for all members except sender
  INSERT INTO group_unread_counts (group_id, user_id, unread_count)
  SELECT NEW.group_id, gm.user_id, 1
  FROM group_members gm
  WHERE gm.group_id = NEW.group_id AND gm.user_id != NEW.sender_id
  ON CONFLICT (group_id, user_id) 
  DO UPDATE SET unread_count = group_unread_counts.unread_count + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_new_message_unread ON messages;
CREATE TRIGGER on_new_message_unread
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION increment_unread_counts();
