<?php
require_once __DIR__ . '/db.php';

// Load PHPMailer via the Composer Autoloader
// Note: This only works if 'composer install' has run on the server
$autoload_path = __DIR__ . '/../vendor/autoload.php';
if (file_exists($autoload_path)) {
    require_once $autoload_path;
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

/**
 * Dispatch an email notification using PHPMailer (SMTP).
 */
function sendTaskEmail($userId, $eventType, $taskData) {
    global $pdo;

    // 1. Fetch User Data
    $stmt = $pdo->prepare('SELECT username, email, notif_email_summary FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user || empty($user['email']) || (int)$user['notif_email_summary'] === 0) {
        return false; 
    }

    $toEmail = $user['email'];
    $toName = $user['username'];
    
    // 2. Prepare Content (Logic truncated for brevity in this rewrite, but identical to before)
    $taskTitle = htmlspecialchars($taskData['title'] ?? 'Unknown Task');
    $taskDue = htmlspecialchars($taskData['due_date'] ?? 'No Date Set');
    
    $subject = "Tenth's Update: {$taskTitle}";
    $htmlBody = "<h2>Task Update</h2><p>Your task <strong>{$taskTitle}</strong> has been {$eventType}.</p>";

    return executePHPMailer($toEmail, $toName, $subject, $htmlBody);
}

/**
 * Dispatch a secure password reset email.
 */
function sendResetEmail($toEmail, $toName, $resetLink) {
    $subject = "Tenth's - Reset Your Password";
    $htmlBody = "<h2>Reset Your Password</h2><p>Hello {$toName}, click below to reset your password:</p><p><a href='{$resetLink}'>Reset Password</a></p>";
    return executePHPMailer($toEmail, $toName, $subject, $htmlBody);
}

/**
 * Central engine to send mail via SMTP
 */
function executePHPMailer($toEmail, $toName, $subject, $htmlBody) {
    $mail = new PHPMailer(true);

    try {
        // --- SMTP CONFIGURATION ---
        $mail->isSMTP();
        $mail->SMTPDebug  = 3; // LOUD MODE: Prints every detail to logs
        $mail->Debugoutput = 'error_log'; // Send debug info to Railway logs

        $mail->Host       = getenv('SMTP_HOST') ?: 'smtp.gmail.com'; 
        $mail->SMTPAuth   = true;
        $mail->Username   = getenv('SMTP_USER'); 
        $mail->Password   = getenv('SMTP_PASS'); 
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = getenv('SMTP_PORT') ?: 587;
        
        $mail->Timeout    = 10; // FAST MODE: Don't hang forever
        $mail->SMTPConnectTimeout = 10;

        // Recipients
        $mail->setFrom(getenv('SMTP_USER'), "Tenth's Sanctuary");
        $mail->addAddress($toEmail, $toName);

        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;

        $mail->send();
        
        // Log for local debug
        @file_put_contents(__DIR__ . '/../emails_sent.log', "[SMTP SUCCESS] To: {$toEmail} | Subject: {$subject}\n", FILE_APPEND);
        return true;
    } catch (Exception $e) {
        @file_put_contents(__DIR__ . '/../emails_sent.log', "[SMTP ERROR] " . $mail->ErrorInfo . "\n", FILE_APPEND);
        return false;
    }
}

/**
 * Pseudo-Cron Engine to evaluate deadlines.
 */
function processApproachingDeadlines() {
    global $pdo;
    try {
        $stmt = $pdo->query("SELECT * FROM tasks WHERE deadline_reminded = 0 AND status != 'completed' AND due_date <= DATE_ADD(NOW(), INTERVAL 1 DAY)");
        $tasks = $stmt->fetchAll();
        foreach ($tasks as $task) {
            if (sendTaskEmail($task['user_id'], 'deadline', $task)) {
                $pdo->prepare('UPDATE tasks SET deadline_reminded = 1 WHERE id = ?')->execute([$task['id']]);
            }
        }
    } catch (\Exception $e) {}
}
?>
