-- Add reply_preview column to messages table
ALTER TABLE messages ADD COLUMN reply_preview jsonb DEFAULT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS messages_reply_preview_idx ON messages USING gin(reply_preview);
