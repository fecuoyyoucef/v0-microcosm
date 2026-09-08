-- Expand group appearance controls while keeping admin-only defaults.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS background_style TEXT DEFAULT 'neural_mesh';

UPDATE groups
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
  'allow_member_appearance_changes', COALESCE((settings->>'allow_member_appearance_changes')::boolean, false),
  'message_theme', COALESCE(settings->>'message_theme', 'teal')
)
WHERE settings IS NULL OR settings->>'message_theme' IS NULL OR settings->>'allow_member_appearance_changes' IS NULL;

COMMENT ON COLUMN groups.background_style IS 'Admin-controlled chat background; member customization is governed by settings.allow_member_appearance_changes';
