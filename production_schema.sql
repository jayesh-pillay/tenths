-- TENTH'S PRODUCTION SCHEMA
-- Combined from init.sql and all update scripts
-- Note: 'CREATE DATABASE' and 'USE' statements have been removed for InfinityFree compatibility.

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    theme_mode ENUM('light', 'dark') DEFAULT 'light',
    notif_email_summary BOOLEAN DEFAULT TRUE,
    notif_push BOOLEAN DEFAULT TRUE,
    notif_tips BOOLEAN DEFAULT FALSE,
    reset_token VARCHAR(64) DEFAULT NULL,
    reset_expires DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    measure_type VARCHAR(100),
    total_count INT DEFAULT 0,
    status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
    progress INT DEFAULT 0 COMMENT '0-100 percentage',
    due_date DATE NOT NULL,
    time_left_str VARCHAR(50), 
    deadline_reminded TINYINT(1) DEFAULT 0,
    progress_50_reminded TINYINT(1) DEFAULT 0,
    progress_100_reminded TINYINT(1) DEFAULT 0,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_breakdowns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    step_index INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    target_val VARCHAR(100) NOT NULL,
    current_val INT DEFAULT 0,
    status ENUM('pending', 'completed') DEFAULT 'pending',
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback_dispatches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    full_name VARCHAR(150),
    email VARCHAR(150),
    category VARCHAR(75),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
