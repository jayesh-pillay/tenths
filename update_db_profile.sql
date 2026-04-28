USE taskflow;
ALTER TABLE users 
ADD COLUMN theme_mode ENUM('light', 'dark') DEFAULT 'light',
ADD COLUMN notif_email_summary BOOLEAN DEFAULT TRUE,
ADD COLUMN notif_push BOOLEAN DEFAULT TRUE,
ADD COLUMN notif_tips BOOLEAN DEFAULT FALSE;
