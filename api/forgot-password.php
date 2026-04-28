<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/email_service.php';

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';

if (empty($email)) {
    echo json_encode(["status" => "error", "message" => "Email address is required."]);
    exit;
}

try {
    // 1. Verify User Exists
    $stmt = $pdo->prepare('SELECT id, username FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        // Security Best Practice: Don't reveal if email exists or not. 
        // We say "If found, we sent it" below.
        echo json_encode(["status" => "success", "message" => "If an account exists for {$email}, a reset link has been sent."]);
        exit;
    }

    // 2. Generate Secure Token (64 char hex)
    $token = bin2hex(random_bytes(32));

    // 3. Save to DB - Sync with Database Time to prevent offset issues
    $stmt = $pdo->prepare('UPDATE users SET reset_token = ?, reset_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?');
    $stmt->execute([$token, $user['id']]);

    // 4. Dispatch Email
    $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $resetLink = "{$protocol}://{$host}/reset-password.html?token={$token}";
    
    $sent = sendResetEmail($email, $user['username'], $resetLink);

    if ($sent) {
        echo json_encode(["status" => "success", "message" => "A reset link has been dispatched to {$email}."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Mail server rejected dispatch. Check logs."]);
    }

} catch (\Exception $e) {
    echo json_encode(["status" => "error", "message" => "Security engine failed to generate link. Try again."]);
}
?>
