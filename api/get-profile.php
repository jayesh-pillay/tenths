<?php
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$user_id = $_SESSION['user_id'];

// Get User Profile Data
$stmt = $pdo->prepare('SELECT id, username, email, theme_mode, notif_email_summary, notif_push, notif_tips FROM users WHERE id = ?');
$stmt->execute([$user_id]);
$user = $stmt->fetch();

if (!$user) {
    echo json_encode(["status" => "error", "message" => "User not found"]);
    exit;
}

// Calculate "Focus Time" metric dynamically based on task completions.
// We'll estimate focus hours = (completed task units / 100) + (completed tasks * 3.5)
$metricStmt = $pdo->prepare("SELECT COUNT(id) as completed_count FROM tasks WHERE user_id = ? AND progress = 100");
$metricStmt->execute([$user_id]);
$res = $metricStmt->fetch();

$completedTasks = (int)$res['completed_count'];
// Math logic to generate a plausible looking focus curve based on real task completions
$focusHours = $completedTasks * 4; // 4 hrs per completed task
$monthlyGoal = 160; 
$pct = $focusHours > 0 ? min(round(($focusHours / $monthlyGoal) * 100), 100) : 0;

echo json_encode([
    "status" => "success",
    "profile" => [
        "username" => $user['username'],
        "email" => $user['email'],
        "theme_mode" => $user['theme_mode'],
        "notif_email_summary" => (bool)$user['notif_email_summary'],
        "notif_push" => (bool)$user['notif_push'],
        "notif_tips" => (bool)$user['notif_tips']
    ],
    "focus_time" => [
        "hours" => $focusHours,
        "goal" => $monthlyGoal,
        "percentage" => $pct
    ]
]);
?>
