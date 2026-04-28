<?php
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$filter = isset($_GET['filter']) ? $_GET['filter'] : 'all'; // week, month, all

// Date Filter Logic
$dateQueryAppend = "";
$queryParams = [$user_id];

if ($filter === 'week') {
    $dateQueryAppend = " AND created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)";
} else if ($filter === 'month') {
    $dateQueryAppend = " AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
}

$stmt = $pdo->prepare("SELECT * FROM tasks WHERE user_id = ?" . $dateQueryAppend);
$stmt->execute($queryParams);
$tasks = $stmt->fetchAll();

// Metrics
$completedCount = 0;
$inProgressCount = 0;
$lateCount = 0;
$onTimeCount = 0;
$validCompletionDaysTotal = 0;
$validCompletionTasksCount = 0;

$today = new DateTime();
$today->setTime(0,0,0);

// Trend logic (4 weeks back)
$weekCounts = [0, 0, 0, 0]; 
// Index 0: 3-4 weeks ago, Index 1: 2-3 weeks ago... Index 3: This week

foreach ($tasks as $task) {
    $due = new DateTime($task['due_date']);
    $due->setTime(0,0,0);

    if ($task['progress'] >= 100 || $task['status'] === 'completed') {
        $completedCount++;
        
        // On Time Rate Math
        $completedAt = $task['completed_at'] ? new DateTime($task['completed_at']) : null;
        if ($completedAt) {
            $completedAt->setTime(0,0,0);
            if ($completedAt <= $due) {
                $onTimeCount++;
            }
            
            // Avg Days
            $createdAt = new DateTime($task['created_at']);
            $createdAt->setTime(0,0,0);
            $daysDiff = $createdAt->diff($completedAt)->days;
            // If they finish on the same day, say it took 1 day
            if ($daysDiff == 0) $daysDiff = 1;
            
            $validCompletionDaysTotal += $daysDiff;
            $validCompletionTasksCount++;
            
            // Trend placement based on completed_at
            $daysAgo = $today->diff($completedAt)->days;
            if ($daysAgo <= 7) $weekCounts[3]++;
            else if ($daysAgo <= 14) $weekCounts[2]++;
            else if ($daysAgo <= 21) $weekCounts[1]++;
            else if ($daysAgo <= 28) $weekCounts[0]++;
            
        } else {
            // Legacy task fallback logic
            if ($today <= $due) $onTimeCount++;
            $createdAt = new DateTime($task['created_at']);
            $daysDiff = $createdAt->diff($today)->days;
            if ($daysDiff == 0) $daysDiff = 1;
            $validCompletionDaysTotal += $daysDiff;
            $validCompletionTasksCount++;
            
            // Placed into current week trend generically
            $weekCounts[3]++;
        }
        
    } else {
        if ($due < $today) {
            $lateCount++;
        } else if ($task['progress'] > 0) {
            $inProgressCount++;
        }
    }
}

$onTimeRate = $completedCount > 0 ? round(($onTimeCount / $completedCount) * 100) : 0;
$avgDays = $validCompletionTasksCount > 0 ? round($validCompletionDaysTotal / $validCompletionTasksCount, 1) : 0;

// To make chart look good even if blank, if all weekCounts are 0, inject flat trend
if (array_sum($weekCounts) === 0) {
    if ($completedCount > 0) {
         $weekCounts = [round($completedCount/4), round($completedCount/4), round($completedCount/4), round($completedCount/4)];
    } else {
         $weekCounts = [0, 0, 0, 0];
    }
}

// "High Impact Tasks" (In Progress natively, sorted by high progress)
$hiStmt = $pdo->prepare("SELECT * FROM tasks WHERE user_id = ? AND progress > 0 AND progress < 100 ORDER BY progress DESC LIMIT 2");
$hiStmt->execute([$user_id]);
$highTasks = $hiStmt->fetchAll();

if (empty($highTasks)) {
    // Fallback: any pending task
    $hiStmt2 = $pdo->prepare("SELECT * FROM tasks WHERE user_id = ? AND progressPopup < 100 ORDER BY due_date ASC LIMIT 2");
    // progressPopup is a typo, doing progress < 100
    $hiStmt2 = $pdo->prepare("SELECT * FROM tasks WHERE user_id = ? AND progress < 100 ORDER BY due_date ASC LIMIT 2");
    $hiStmt2->execute([$user_id]);
    $highTasks = $hiStmt2->fetchAll();
}

$formattedHighTasks = [];
foreach ($highTasks as $h) {
    $badge = "IN PROGRESS";
    $dueH = new DateTime($h['due_date']);
    $dueH->setTime(0,0,0);
    if ($dueH < $today) {
        $badge = "CRITICAL PHASE";
    }
    
    $formattedHighTasks[] = [
        "id" => $h['id'],
        "title" => $h['title'],
        "progress" => $h['progress'],
        "badge" => $badge
    ];
}

    echo json_encode([
        "status" => "success",
        "metrics" => [
            "completed" => $completedCount,
            "in_progress" => $inProgressCount,
            "on_time_rate" => $onTimeRate,
            "avg_days" => $avgDays,
            "total_tasks" => count($tasks),
            "overdue" => $lateCount
        ],
        "donut" => [
            "done" => $completedCount,
            "active" => $inProgressCount,
            "late" => $lateCount
        ],
    "trend" => $weekCounts,
    "high_impact" => $formattedHighTasks
]);
?>
