-- Fix fcm_tokens table to properly handle multiple devices per user

-- First, add unique constraint on token (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fcm_tokens_token_unique'
  ) THEN
    ALTER TABLE fcm_tokens ADD CONSTRAINT fcm_tokens_token_unique UNIQUE (token);
  END IF;
END $$;

-- Add device_id column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fcm_tokens' AND column_name = 'device_id'
  ) THEN
    ALTER TABLE fcm_tokens ADD COLUMN device_id TEXT;
  END IF;
END $$;

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);

-- Create index on updated_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_updated_at ON fcm_tokens(updated_at);

-- Delete old tokens (older than 30 days without update)
DELETE FROM fcm_tokens 
WHERE updated_at < NOW() - INTERVAL '30 days';

-- Show current tokens count
SELECT COUNT(*) as total_tokens, COUNT(DISTINCT user_id) as unique_users FROM fcm_tokens;
