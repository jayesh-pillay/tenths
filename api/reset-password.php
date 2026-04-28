<?php
require_once __DIR__ . '/db.php';

$data = json_decode(file_get_contents('php://input'), true);
$token = $data['token'] ?? '';
$newPassword = $data['password'] ?? '';

if (empty($token) || empty($newPassword)) {
    echo json_encode(["status" => "error", "message" => "Invalid request parameters."]);
    exit;
}

if (strlen($newPassword) < 8) {
    echo json_encode(["status" => "error", "message" => "Password must be at least 8 characters."]);
    exit;
}

try {
    // 1. Verify Token and Expiry
    $stmt = $pdo->prepare('SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW()');
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        echo json_encode(["status" => "error", "message" => "This reset link is invalid or has expired."]);
        exit;
    }

    // 2. Hash New Password
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

    // 3. Update User and Clear Token
    $stmt = $pdo->prepare('UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?');
    $stmt->execute([$hashedPassword, $user['id']]);

    echo json_encode(["status" => "success", "message" => "Your password has been successfully reset. You can now login."]);

} catch (\Exception $e) {
    echo json_encode(["status" => "error", "message" => "Security engine failed to update credentials."]);
}
?>
