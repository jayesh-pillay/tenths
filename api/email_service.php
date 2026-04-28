<?php
require_once __DIR__ . '/db.php';

/**
 * Dispatch an email notification.
 * 
 * @param int $userId The ID of the user to send the email to.
 * @param string $eventType 'created', 'updated', 'deleted', 'progress_50', 'progress_100', 'deadline'
 * @param array $taskData Associative array of task data (title, due_date, progress, etc.)
 */
function sendTaskEmail($userId, $eventType, $taskData) {
    global $pdo;

    // 1. Fetch User Email, Name, and Notification Preference
    $stmt = $pdo->prepare('SELECT username, email, notif_email_summary FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user || empty($user['email'])) {
        return false; // Cannot send without an email
    }

    // Master Switch: Shield the user from non-security spam if opted out
    if ((int)$user['notif_email_summary'] === 0) {
        return true; 
    }

    $toEmail = $user['email'];
    $toName = $user['username'];

    $subject = "Tenth's - Task Update";
    $bodyTitle = "Task Update";
    $bodyContent = "";
    
    $taskTitle = htmlspecialchars($taskData['title'] ?? 'Unknown Task');
    $taskDue = htmlspecialchars($taskData['due_date'] ?? 'No Date Set');

    // 2. Select Template Content Based on Event Type
    switch ($eventType) {
        case 'created':
            $subject = "Task Created: {$taskTitle}";
            $bodyTitle = "New Task Captured";
            $bodyContent = "
                <p>You have successfully captured a new focus item in your sanctuary.</p>
                <div class='highlight-box'>
                    <strong>Title:</strong> {$taskTitle}<br>
                    <strong>Target Deadline:</strong> {$taskDue}<br>
                    <strong>Category:</strong> " . htmlspecialchars($taskData['category'] ?? 'N/A') . "
                </div>
            ";
            break;
            
        case 'updated':
            $subject = "Task Updated: {$taskTitle}";
            $bodyTitle = "Task Modified";
            $bodyContent = "
                <p>Your task parameters have been updated.</p>
                <div class='highlight-box'>
                    <strong>Title:</strong> {$taskTitle}<br>
                    <strong>Target Deadline:</strong> {$taskDue}
                </div>
                <p>Log in to view the complete details of your updated workflow.</p>
            ";
            break;

        case 'deleted':
            $subject = "Task Removed: {$taskTitle}";
            $bodyTitle = "Task Archive Cleared";
            $bodyContent = "
                <p>You have permanently deleted the task <strong>{$taskTitle}</strong>.</p>
                <p>This item has been removed from your digital sanctuary and all related analytics have been purged.</p>
            ";
            break;

        case 'progress_50':
            $subject = "Halfway There: {$taskTitle}";
            $bodyTitle = "50% Milestone Reached!";
            $bodyContent = "
                <p>Great focus! You've just crossed the 50% completion threshold for <strong>{$taskTitle}</strong>.</p>
                <p>Keep up the momentum. You're doing excellent work.</p>
            ";
            break;

        case 'progress_100':
            $subject = "Task Completed: {$taskTitle}";
            $bodyTitle = "Mission Accomplished!";
            $bodyContent = "
                <p>Outstanding work. You've reached 100% completion on <strong>{$taskTitle}</strong>.</p>
                <p>Take a moment to reflect on your progress, and then prepare for your next focus block.</p>
            ";
            break;

        case 'deadline':
            $subject = "Approaching Deadline: {$taskTitle}";
            $bodyTitle = "24-Hour Warning";
            $bodyContent = "
                <p>Your deadline for <strong>{$taskTitle}</strong> is arriving in less than 24 hours (Due: {$taskDue}).</p>
                <p>Make sure to allocate sufficient focus time today to finalize this item.</p>
            ";
            break;
            
        default:
            return false;
    }

    // 3. Render HTML Envelope Template (Tenths Aesthetic)
    $htmlEmail = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F8F6F4; color: #111111; margin: 0; padding: 0; }
            .email-wrapper { max-width: 600px; margin: 40px auto; background-color: #FFFFFF; border: 1px solid #EAEAEA; border-radius: 8px; overflow: hidden; }
            .header { background-color: #775A50; padding: 30px; text-align: center; color: #FFFFFF; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 500; letter-spacing: 1px; }
            .header p { margin: 5px 0 0; font-size: 12px; opacity: 0.8; letter-spacing: 2px; text-transform: uppercase; }
            .content { padding: 40px; line-height: 1.6; }
            .highlight-box { background-color: #F8F6F4; padding: 20px; border-left: 4px solid #775A50; margin: 25px 0; border-radius: 0 4px 4px 0; }
            .footer { padding: 30px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #EAEAEA; }
            .btn { display: inline-block; background-color: #775A50; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class='email-wrapper'>
            <div class='header'>
                <h1>Tenth's</h1>
                <p>The Guided Sanctuary</p>
            </div>
            <div class='content'>
                <h2 style='color: #775A50; margin-top: 0;'>{$bodyTitle}</h2>
                <p>Hello {$toName},</p>
                {$bodyContent}
                
                <a href='http://localhost:8000/dashboard.html' class='btn' style='color: #FFFFFF; text-decoration: none;'>Open Dashboard</a>
            </div>
            <div class='footer'>
                <p>This is an automated notification from Tenth's workflow engine.</p>
                <p>&copy; " . date('Y') . " Tenth's Digital Sanctuary</p>
            </div>
        </div>
    </body>
    </html>
    ";

    // 4. Send via multiple methods (Resend API HTTP POST and write to log for local debug)
    
    // Resend cURL API Engine
    // Grab your key from resend.com and paste it inside the Bearer text below!
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.resend.com/emails');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'from' => 'Tenths Notifications <onboarding@resend.dev>', // Resend lets you use onboarding@resend.dev dynamically for testing!
        'to' => [$toEmail],
        'subject' => $subject,
        'html' => $htmlEmail
    ]));
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer YOUR_RESEND_API_KEY',
        'Content-Type: application/json'
    ]);
    
    // Stabilize Local Request: Disable SSL verification for development to prevent warnings
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    
    // Execute real API call
    $result = curl_exec($ch);
    curl_close($ch);
    
    // Local Debugger: Suppress warnings with @ to prevent JSON corruption if permissions are restricted
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "\n\n======================================================\n";
    $logEntry .= "TIMESTAMP: {$timestamp}\n";
    $logEntry .= "TO: {$toName} <{$toEmail}>\n";
    $logEntry .= "SUBJECT: {$subject}\n";
    $logEntry .= "======================================================\n";
    $logEntry .= $htmlEmail;
    $logEntry .= "\n======================================================\n";
    
    @file_put_contents(__DIR__ . '/../emails_sent.log', $logEntry, FILE_APPEND);
    
    return true;
}

/**
 * Dispatch a secure password reset email.
 * 
 * @param string $toEmail
 * @param string $toName
 * @param string $resetLink The unique URL for the password reset page
 */
function sendResetEmail($toEmail, $toName, $resetLink) {
    global $pdo;

    $subject = "Tenth's - Reset Your Password";
    $bodyTitle = "Account Access Reclaimed";
    
    // Render HTML Envelope Template (Tenths Aesthetic)
    $htmlEmail = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F8F6F4; color: #111111; margin: 0; padding: 0; }
            .email-wrapper { max-width: 600px; margin: 40px auto; background-color: #FFFFFF; border: 1px solid #EAEAEA; border-radius: 8px; overflow: hidden; }
            .header { background-color: #775A50; padding: 30px; text-align: center; color: #FFFFFF; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 500; letter-spacing: 1px; }
            .header p { margin: 5px 0 0; font-size: 12px; opacity: 0.8; letter-spacing: 2px; text-transform: uppercase; }
            .content { padding: 40px; line-height: 1.6; }
            .highlight-box { background-color: #F8F6F4; padding: 20px; border-left: 4px solid #775A50; margin: 25px 0; border-radius: 0 4px 4px 0; }
            .footer { padding: 30px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #EAEAEA; }
            .btn { display: inline-block; background-color: #775A50; color: #FFFFFF !important; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class='email-wrapper'>
            <div class='header'>
                <h1>Tenth's</h1>
                <p>The Guided Sanctuary</p>
            </div>
            <div class='content'>
                <h2 style='color: #775A50; margin-top: 0;'>{$bodyTitle}</h2>
                <p>Hello {$toName},</p>
                <p>We received a request to reclaim access to your Tenth's account. To reset your password, please click the secure link below. This invitation will expire in 1 hour.</p>
                
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='{$resetLink}' class='btn'>Set New Password</a>
                </div>

                <p>If you did not request this, you can safely ignore this email. Your current credentials remain secure.</p>
                
                <p style='font-size: 12px; color: #888; margin-top: 30px;'>Alternatively, copy and paste this URL into your browser:<br>{$resetLink}</p>
            </div>
            <div class='footer'>
                <p>This is an automated security notification from Tenth's sanctuary.</p>
                <p>&copy; " . date('Y') . " Tenth's Digital Sanctuary</p>
            </div>
        </div>
    </body>
    </html>
    ";

    // Grab your key from resend.com and paste it inside the Bearer text below!
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.resend.com/emails');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'from' => 'Tenths Security <onboarding@resend.dev>',
        'to' => [$toEmail],
        'subject' => $subject,
        'html' => $htmlEmail
    ]));
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer YOUR_RESEND_API_KEY',
        'Content-Type: application/json'
    ]);
    
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    
    // Execute real API call
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    // Log for local debug
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "\n\n==================== SECURITY: PASSWORD RESET ====================\n";
    $logEntry .= "TIMESTAMP: {$timestamp}\n";
    $logEntry .= "TO: {$toName} <{$toEmail}>\n";
    $logEntry .= "ACTION: Password Reset Link\n";
    $logEntry .= "API STATUS: {$httpCode}\n";
    $logEntry .= "API RESULT: {$result}\n";
    $logEntry .= "==================================================================\n";
    $logEntry .= $htmlEmail;
    $logEntry .= "\n==================================================================\n";
    
    @file_put_contents(__DIR__ . '/../emails_sent.log', $logEntry, FILE_APPEND);
    
    return true;
}

/**
 * Pseudo-Cron Engine to evaluate deadlines.
 * Call this dynamically to scan the database and dispatch 24h deadline warnings asynchronously.
 */
function processApproachingDeadlines() {
    global $pdo;
    
    try {
        $stmt = $pdo->query("
            SELECT * FROM tasks 
            WHERE deadline_reminded = 0 
              AND status != 'completed' 
              AND progress < 100
              AND due_date IS NOT NULL
              AND due_date >= DATE(NOW())
              AND due_date <= DATE_ADD(DATE(NOW()), INTERVAL 1 DAY)
        ");

        $upcomingDeadlines = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($upcomingDeadlines as $task) {
            $success = sendTaskEmail($task['user_id'], 'deadline', [
                'title' => $task['title'],
                'due_date' => $task['due_date']
            ]);

            if ($success) {
                // Lock the reminder so they only receive this one time
                $u_stmt = $pdo->prepare('UPDATE tasks SET deadline_reminded = 1 WHERE id = ?');
                $u_stmt->execute([$task['id']]);
            }
        }
    } catch (\Exception $e) {
        // Silently catch so we don't break the dashboard UI if the DB misses something
    }
}
?>
