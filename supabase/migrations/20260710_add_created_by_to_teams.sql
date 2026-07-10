-- Add created_by field to teams table to track who created the team
-- This helps identify team leaders who are responsible for project submission

ALTER TABLE teams 
ADD COLUMN created_by UUID REFERENCES participants(id) ON DELETE SET NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN teams.created_by IS 'The participant who created this team (team leader responsible for project submission)';
