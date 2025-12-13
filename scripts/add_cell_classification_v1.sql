-- Add new columns to groups table for cell classification
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS cell_category TEXT CHECK (cell_category IN ('project', 'discussion')) DEFAULT 'discussion',
ADD COLUMN IF NOT EXISTS goal TEXT,
ADD COLUMN IF NOT EXISTS responsibility_score INTEGER DEFAULT 100 CHECK (responsibility_score >= 0 AND responsibility_score <= 100),
ADD COLUMN IF NOT EXISTS progress_score INTEGER DEFAULT 0 CHECK (progress_score >= 0 AND progress_score <= 100),
ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS metrics_last_calculated TIMESTAMP WITH TIME ZONE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_groups_cell_category ON groups(cell_category);
CREATE INDEX IF NOT EXISTS idx_groups_responsibility_score ON groups(responsibility_score);
CREATE INDEX IF NOT EXISTS idx_groups_last_activity ON groups(last_activity_date);

-- Comment on columns
COMMENT ON COLUMN groups.cell_category IS 'نوع الخلية: project (مشروع) أو discussion (حوار)';
COMMENT ON COLUMN groups.goal IS 'هدف الخلية: المشروع المحدد أو موضوع الحوار';
COMMENT ON COLUMN groups.responsibility_score IS 'معيار المسؤولية: من 0 إلى 100';
COMMENT ON COLUMN groups.progress_score IS 'معيار التقدم (للمشاريع فقط): من 0 إلى 100';
