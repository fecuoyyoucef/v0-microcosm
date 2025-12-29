-- Add support for multiple attachments per message
-- Change attachment_url and attachment_type to arrays

ALTER TABLE messages 
  DROP COLUMN attachment_url,
  DROP COLUMN attachment_type;

ALTER TABLE messages
  ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;

-- attachments structure: [{ url: string, type: 'image' | 'document', name: string, size: number }]

COMMENT ON COLUMN messages.attachments IS 'Array of file attachments with metadata';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING gin (attachments);
