USE taskflow;

-- Add current_val column to track user progress for each specific breakdown block.
ALTER TABLE task_breakdowns ADD COLUMN current_val INT DEFAULT 0 AFTER target_val;
