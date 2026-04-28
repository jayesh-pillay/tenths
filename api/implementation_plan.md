# Email Notification Architecture for Tenths

This implementation plan outlines how we will add an automated, event-driven email notification system to your existing PHP backend. 

We will intercept user actions exactly when they happen on the server and trigger beautifully formatted, context-aware emails using PHP's native mail handler.

## User Review Required

> [!WARNING]
> **Email Delivery in Local Environments**
> Because you are running the `php -S localhost:8000` test server on macOS, your computer likely does not have an active SMTP relay (like Sendmail/Postfix) configured out of the box. 
> 
> *What this means for you*: The PHP `mail()` function might execute successfully but drop the email silently without actually hitting an inbox. 
> *Our Solution*: I will design the system so that it **physically writes the beautiful HTML emails to an `emails_sent.log` file** in addition to attempting to send them. This way, you can verify exactly what the emails look like during local testing without needing a complicated SMTP setup!

> [!IMPORTANT]
> **Database Alteration Required**
> To prevent the system from accidentally spamming users 100 times for a "Deadline Approaching" warning, we need to add a small flag to the database. I will write a script to run `ALTER TABLE tasks ADD COLUMN deadline_reminded TINYINT(1) DEFAULT 0;`

## Proposed Changes

---

### Centralized Email Engine

#### [NEW] `api/email_service.php`
- A reusable PHP class that accesses the database to retrieve user emails based on `user_id`.
- Pre-packaged with beautifully styled, brown/white minimalist HTML email templates matching the Dashboard aesthetic.
- Exposes a master function: `sendTaskEmail($userId, $eventType, $taskData)`.
- **Event Types Handled**: `created`, `updated`, `deleted`, `progress`, and `deadline`.

---

### Intercepting User Actions (CRUD Integration)

#### [MODIFY] `api/create-task.php`
- Import `email_service.php`.
- Directly after successfully inserting the new task, call `sendTaskEmail()` passing the 'created' parameter, task title, deadline, and description.

#### [MODIFY] `api/update-task.php` & `api/update-progress.php`
- Import `email_service.php`.
- Intercept the successful modifications to the database and trigger the 'updated' or 'progress' emails, dynamically parsing what changed (e.g. "You are now 60% complete with Project Alpha").

#### [MODIFY] `api/delete-task.php`
- Fetch the task title *prior* to executing the `<DELETE>` SQL directive.
- Dispatch the 'deleted' email confirming the permanent removal of the task from their archive.

---

### Deadline Automation

#### [NEW] `sql_update_email_flag.sql`
- We will execute this script against your MySQL database:
  `ALTER TABLE tasks ADD COLUMN deadline_reminded TINYINT(1) DEFAULT 0;`

#### [NEW] `api/cron_deadlines.php`
- A brand new script logic that scans the `tasks` table for any tasks whose `due_date` is exactly $\le$ 24 hours away.
- If it finds a task that hasn't been flagged yet (`deadline_reminded = 0`), it fires off the 'deadline' warning email and sets the flag to `1`.
- *Architecture trick*: We will quietly ping this script in the background every time a user loads the dashboard, effectively creating a pseudo-cron job that evaluates deadlines automatically without server-level crontab administration!

## Open Questions

1. Do you want the "Progress Made" email to trigger **every single time** they move the progress bar? Or should it only trigger if they hit a major milestone (e.g., reached 50%, or hit 100% completed)? Firing an email every time they add +1 to a tracker might get noisy!
2. Do you have API keys for a real SMTP service (like SendGrid or MailTrap), or are you comfortable with the logging approach I outlined for local testing?

## Verification Plan

### Manual Verification
1. I will execute the SQL alter script to update the database schema.
2. We will attempt to create, update, progress, and delete a task through the dashboard UI.
3. We will instantly check the `emails_sent.log` file in the root directory to visualize the raw HTML templates and confirm data was injected perfectly into the email body!
