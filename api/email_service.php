<?php
require_once __DIR__ . '/db.php';

/**
 * Dispatch an email notification using Brevo API (Firewall-Proof).
 */
function sendTaskEmail($userId, $eventType, $taskData) {
    global $pdo;

    $stmt = $pdo->prepare('SELECT username, email, notif_email_summary FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user || empty($user['email']) || (int)$user['notif_email_summary'] === 0) {
        return false; 
    }

    $toEmail = $user['email'];
    $toName = $user['username'];
    
    $taskTitle = htmlspecialchars($taskData['title'] ?? 'Unknown Task');
    $subject = "Tenth's Update: {$taskTitle}";
    $htmlBody = "<h2>Task Update</h2><p>Your task <strong>{$taskTitle}</strong> has been {$eventType}.</p>";

    return executeBrevoAPI($toEmail, $toName, $subject, $htmlBody);
}

/**
 * Dispatch a secure password reset email.
 */
function sendResetEmail($toEmail, $toName, $resetLink) {
    $subject = "Tenth's - Reset Your Password";
    $htmlBody = "<h2>Reset Your Password</h2><p>Hello {$toName}, click below to reset your password:</p><p><a href='{$resetLink}'>Reset Password</a></p>";
    return executeBrevoAPI($toEmail, $toName, $subject, $htmlBody);
}

/**
 * Central engine to send mail via Brevo HTTP API
 * This bypasses all SMTP firewalls!
 */
function executeBrevoAPI($toEmail, $toName, $subject, $htmlBody) {
    $apiKey = getenv('BREVO_API_KEY');
    $senderEmail = getenv('SMTP_USER'); // Use your verified Brevo sender email
    
    if (!$apiKey) {
        @file_put_contents(__DIR__ . '/../emails_sent.log', "[BREVO ERROR] Missing BREVO_API_KEY\n", FILE_APPEND);
        return false;
    }

    $data = [
        "sender" => ["name" => "Tenth's Sanctuary", "email" => $senderEmail],
        "to" => [["email" => $toEmail, "name" => $toName]],
        "subject" => $subject,
        "htmlContent" => $htmlBody
    ];

    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'api-key: ' . $apiKey,
        'Content-Type: application/json',
        'Accept: application/json'
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        @file_put_contents(__DIR__ . '/../emails_sent.log', "[BREVO SUCCESS] To: {$toEmail} | Resp: {$response}\n", FILE_APPEND);
        return true;
    } else {
        @file_put_contents(__DIR__ . '/../emails_sent.log', "[BREVO ERROR] Code: {$httpCode} | Resp: {$response}\n", FILE_APPEND);
        return false;
    }
}

/**
 * Pseudo-Cron hook to dispatch approaching deadline emails
 */
function processApproachingDeadlines() {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("
            SELECT t.*, u.email, u.username, u.notif_email_summary 
            FROM tasks t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.status != 'completed' 
              AND t.deadline_reminded = 0 
              AND t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 2 DAY)
              AND u.notif_email_summary = 1
        ");
        $stmt->execute();
        $tasks = $stmt->fetchAll();
        
        foreach ($tasks as $task) {
            $toEmail = $task['email'];
            $toName = $task['username'];
            $taskTitle = htmlspecialchars($task['title']);
            $dueDate = $task['due_date'];
            
            $subject = "Tenth's Alert: Approaching Deadline for {$taskTitle}";
            $htmlBody = "<h2>Approaching Deadline</h2><p>Hello {$toName}, your task <strong>{$taskTitle}</strong> is due on {$dueDate}. Let's get it done!</p>";
            
            if (executeBrevoAPI($toEmail, $toName, $subject, $htmlBody)) {
                $updateStmt = $pdo->prepare("UPDATE tasks SET deadline_reminded = 1 WHERE id = ?");
                $updateStmt->execute([$task['id']]);
            }
        }
    } catch (\Exception $e) {
        // Silently fail for pseudo-cron
    }
}
?>
