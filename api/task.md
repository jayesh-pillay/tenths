# Email Notification System Tasks

- [x] Execute Database Schema Alteration
- [x] Create `api/email_service.php` (Mail engine + beautiful templates + dual-logging system)
- [x] Modify `api/create-task.php` to dispatch 'created' email
- [x] Modify `api/update-task.php` to dispatch 'updated' email 
- [x] Modify `api/delete-task.php` to dispatch 'deleted' email
- [x] Modify `api/task-view.php` to dispatch milestone emails (50% and 100%)
- [x] Create `processApproachingDeadlines` inside `api/email_service.php`
- [x] Inject pseudo-cron ping into `api/dashboard.php` to trigger deadline checks seamlessly.
