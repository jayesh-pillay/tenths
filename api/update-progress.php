<?php
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(["status" => "error", "message" => "Invalid input data."]);
    exit;
}

$user_id = $_SESSION['user_id'];
$breakdown_id = isset($input['breakdown_id']) ? (int)$input['breakdown_id'] : 0;
$added_val = isset($input['amount_to_add']) ? (int)$input['amount_to_add'] : 0;

if ($breakdown_id <= 0 || $added_val < 0) {
    echo json_encode(["status" => "error", "message" => "Invalid parameters"]);
    exit;
}

// Ensure the breakdown belongs to a task owned by the user
$stmt = $pdo->prepare('
    SELECT tb.*, t.user_id 
    FROM task_breakdowns tb
    JOIN tasks t ON tb.task_id = t.id
    WHERE tb.id = ?
');
$stmt->execute([$breakdown_id]);
$b = $stmt->fetch();

if (!$b || $b['user_id'] != $user_id) {
    echo json_encode(["status" => "error", "message" => "Breakdown not found or unauthorized"]);
    exit;
}

// Perform update
try {
    $new_val = $b['current_val'] + $added_val;
    // Cap at target if desired
    $targetNum = filter_var($b['target_val'], FILTER_SANITIZE_NUMBER_INT);
    $targetVal = intval($targetNum);
    if ($targetVal > 0 && $new_val > $targetVal) {
        $new_val = $targetVal; 
    }

    $u_stmt = $pdo->prepare('UPDATE task_breakdowns SET current_val = ? WHERE id = ?');
    $u_stmt->execute([$new_val, $breakdown_id]);

    // We don't bother recalculating here, we just tell the front-end to fetch api/task-view.php again!
    echo json_encode(["status" => "success", "new_val" => $new_val]);
} catch (\PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error"]);
}
?>
