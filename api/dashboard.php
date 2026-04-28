<?php
require_once 'db.php';
require_once 'email_service.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$user_id = $_SESSION['user_id'];

// Get User Identity directly from database to ensure real-time sync
$userStmt = $pdo->prepare('SELECT username, notif_tips FROM users WHERE id = ?');
$userStmt->execute([$user_id]);
$userRow = $userStmt->fetch();
$username = $userRow ? $userRow['username'] : 'User';
$notifTips = $userRow ? (bool)$userRow['notif_tips'] : false;

// Get all tasks for user
$stmt = $pdo->prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC');
$stmt->execute([$user_id]);
$tasks = $stmt->fetchAll();

$total = count($tasks);
$completedCount = 0;
$inProgressTasks = [];
$deadlineTasks = [];
$pressingTask = null;

foreach ($tasks as $task) {
    if ($task['status'] === 'completed' || $task['progress'] == 100) {
        $completedCount++;
    } else {
        if ($task['status'] === 'in_progress') {
            $inProgressTasks[] = $task;
        } else {
            // Treat pending as deadlines or just general uncompleted
            $deadlineTasks[] = $task;
        }
        
        // Find most pressing task (closest deadline)
        if (!$pressingTask || strtotime($task['due_date']) < strtotime($pressingTask['due_date'])) {
            $pressingTask = $task;
        }
    }
}

// Fallback if all lists are empty but we have uncompleted
if (empty($inProgressTasks) && !empty($deadlineTasks)) {
    $inProgressTasks = array_slice($deadlineTasks, 0, 2);
}
if (empty($deadlineTasks) && !empty($inProgressTasks)) {
    $deadlineTasks = array_slice($inProgressTasks, -2);
}

$completionPercentage = $total > 0 ? round(($completedCount / $total) * 100) : 0;

// Dynamic Subtitle Text (Req: Para below welcome should show urgent task)
$urgentText = $total - $completedCount . " tasks pending completion today.";
if ($pressingTask) {
    $urgentText = "Your task '{$pressingTask['title']}' needs urgent care.";
} else if ($total === 0) {
    $urgentText = "You have no tasks pending! Time to relax or create a new one.";
} else if ($total === $completedCount) {
    $urgentText = "All caught up! Excellent work.";
}

// Dynamic Motivational Moment (Req: dynamic motivation based on progress)
$motivation = "";
if ($total === 0) {
    $motivation = '"A journey of a thousand miles begins with a single step. Start your first task today!"';
} else if ($completionPercentage === 100) {
    $motivation = '"Outstanding! You have completed all your tasks. Take a well-deserved break, ' . $username . '!"';
} else if ($completionPercentage > 50) {
    $motivation = '"Great progress today, ' . $username . '! You\'re almost at your goal. Keep that momentum going."';
} else if ($completionPercentage > 0) {
    $motivation = '"You are making solid headway, ' . $username . '. Every completed task brings you closer to your goal."';
} else {
    $motivation = '"You\'ve mapped out your goals. Now it\'s time to crush them. You got this, ' . $username . '!"';
}

// Pseudo-Cron hook to dispatch approaching deadline emails
processApproachingDeadlines();

echo json_encode([
    "status" => "success",
    "data" => [
        "user" => [
            "name" => $username
        ],
        "urgent_text" => $urgentText,
        "motivation" => $motivation,
        "stats" => [
            "total" => $total,
            "completed" => $completedCount,
            "percentage" => $completionPercentage
        ],
        "in_progress" => array_slice($inProgressTasks, 0, 4),
        "deadlines" => array_slice($deadlineTasks, 0, 4),
        "notif_tips" => $notifTips
    ]
]);
?>
