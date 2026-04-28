USE taskflow;

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
