-- Add column to track last cell type change
ALTER TABLE groups ADD COLUMN IF NOT EXISTS last_cell_type_change TIMESTAMP WITH TIME ZONE;

-- Update existing groups with a default value (can change anytime initially)
UPDATE groups SET last_cell_type_change = NULL WHERE last_cell_type_change IS NULL;

-- Create a helper function to check if cell type can be changed
CREATE OR REPLACE FUNCTION can_change_cell_type(group_id UUID)
RETURNS OBJECT AS $$
BEGIN
  DECLARE
    last_change groups.last_cell_type_change%TYPE;
    days_since_change INTEGER;
  BEGIN
    SELECT last_cell_type_change INTO last_change FROM groups WHERE id = group_id;
    
    IF last_change IS NULL THEN
      RETURN jsonb_build_object('can_change', true, 'days_remaining', 0, 'message', 'يمكنك تغيير النوع الآن');
    END IF;
    
    days_since_change := EXTRACT(DAY FROM (NOW() - last_change))::INTEGER;
    
    IF days_since_change >= 60 THEN
      RETURN jsonb_build_object('can_change', true, 'days_remaining', 0, 'message', 'يمكنك تغيير النوع الآن');
    ELSE
      RETURN jsonb_build_object(
        'can_change', false, 
        'days_remaining', 60 - days_since_change,
        'message', 'لا يمكن تغيير نوع الخلية الآن. يتبقى ' || (60 - days_since_change) || ' أيام'
      );
    END IF;
  END;
END;
$$ LANGUAGE plpgsql;
