USE taskflow;
ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP NULL;
