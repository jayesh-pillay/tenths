<?php
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['current_password']) || empty($input['new_password'])) {
    echo json_encode(["status" => "error", "message" => "Missing password data."]);
    exit;
}

$user_id = $_SESSION['user_id'];
$current = $input['current_password'];
$new = $input['new_password'];

if (strlen($new) < 8) {
    echo json_encode(["status" => "error", "message" => "New password must be strictly at least 8 characters long."]);
    exit;
}

// Check current password authenticity
$check = $pdo->prepare('SELECT password FROM users WHERE id = ?');
$check->execute([$user_id]);
$row = $check->fetch();

if (!$row || !password_verify($current, $row['password'])) {
    echo json_encode(["status" => "error", "message" => "Incorrect current password."]);
    exit;
}

// Execute safe cryptographic mutation
$hashed = password_hash($new, PASSWORD_DEFAULT);
$update = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
if ($update->execute([$hashed, $user_id])) {
    echo json_encode(["status" => "success", "message" => "Password securely updated."]);
} else {
    echo json_encode(["status" => "error", "message" => "Terminal failure in updating user vault."]);
}
?>
