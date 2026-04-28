USE taskflow;

-- Update existing tasks table to support the new features
-- Only run these ALTER statements if the columns do not already exist
-- MySQL doesn't natively support "ADD COLUMN IF NOT EXISTS" elegantly without procedures in older versions, 
-- but this script assumes you process it linearly.

ALTER TABLE tasks ADD COLUMN description TEXT AFTER category;
ALTER TABLE tasks ADD COLUMN measure_type VARCHAR(100) AFTER description;
ALTER TABLE tasks ADD COLUMN total_count INT DEFAULT 0 AFTER measure_type;

-- Create the new task_breakdowns table
CREATE TABLE IF NOT EXISTS task_breakdowns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    step_index INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    target_val VARCHAR(100) NOT NULL,
    status ENUM('pending', 'completed') DEFAULT 'pending',
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Added for email notifications
ALTER TABLE tasks ADD COLUMN deadline_reminded TINYINT(1) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN progress_50_reminded TINYINT(1) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN progress_100_reminded TINYINT(1) DEFAULT 0;
