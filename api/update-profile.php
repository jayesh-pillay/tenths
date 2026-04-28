<?php
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['username'])) {
    echo json_encode(["status" => "error", "message" => "Invalid payload"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$username = trim($input['username']);

// Check if username is already in use by someone else
$check = $pdo->prepare('SELECT id FROM users WHERE username = ? AND id != ?');
$check->execute([$username, $user_id]);
if ($check->rowCount() > 0) {
    echo json_encode(["status" => "error", "message" => "This username is already taken. Please choose another one."]);
    exit;
}

$stmt = $pdo->prepare('UPDATE users SET username = ? WHERE id = ?');
if ($stmt->execute([$username, $user_id])) {
    $_SESSION['username'] = $username;
    echo json_encode(["status" => "success", "message" => "Profile successfully updated."]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to update profile."]);
}
?>
