<?php
require_once 'db.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['full_name']) || empty($input['email']) || empty($input['message'])) {
    echo json_encode(["status" => "error", "message" => "Please fill out all required fields."]);
    exit;
}

$user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
$full_name = trim($input['full_name']);
$email = trim($input['email']);
$category = isset($input['category']) ? trim($input['category']) : 'General Query';
$message = trim($input['message']);

$stmt = $pdo->prepare('INSERT INTO feedback_dispatches (user_id, full_name, email, category, message) VALUES (?, ?, ?, ?, ?)');

if ($stmt->execute([$user_id, $full_name, $email, $category, $message])) {
    echo json_encode(["status" => "success", "message" => "Dispatch successfully transmitted. We will review your thoughts shortly."]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to transmit dispatch. System error."]);
}
?>
