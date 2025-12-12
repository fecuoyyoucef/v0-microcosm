-- Add background_style column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS background_style TEXT DEFAULT 'neural_mesh';

-- Valid values: 'neural_mesh', 'neural_network', 'matrix_code', 'neuron_cell', 'none'
