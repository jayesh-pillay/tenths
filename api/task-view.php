<?php
require_once 'db.php';
require_once 'email_service.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$task_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($task_id <= 0) {
    echo json_encode(["status" => "error", "message" => "Invalid Task ID"]);
    exit;
}

// Fetch Parent Task
$stmt = $pdo->prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?');
$stmt->execute([$task_id, $user_id]);
$task = $stmt->fetch();

if (!$task) {
    echo json_encode(["status" => "error", "message" => "Task not found"]);
    exit;
}

// Fetch Breakdowns
$b_stmt = $pdo->prepare('SELECT * FROM task_breakdowns WHERE task_id = ? ORDER BY step_index ASC');
$b_stmt->execute([$task_id]);
$breakdowns = $b_stmt->fetchAll();

// Calculate total overall progress aggregating breakdowns
$totalBreakdownTarget = 0;
$totalBreakdownCurrent = 0;

foreach ($breakdowns as &$b) {
    // Numeric extraction for target string tracking
    $targetNum = filter_var($b['target_val'], FILTER_SANITIZE_NUMBER_INT);
    $targetVal = intval($targetNum);
    $currentVal = (int)$b['current_val'];
    
    // Auto-calculate the minimum int parsing
    $minTargetVal = 0;
    if (!empty($b['min_target_val'])) {
        $minNum = filter_var($b['min_target_val'], FILTER_SANITIZE_NUMBER_INT);
        $minTargetVal = intval($minNum);
    }
    
    if ($targetVal <= 0) $targetVal = 1; // avoid division by zero
    if ($currentVal > $targetVal) $currentVal = $targetVal;
    
    $totalBreakdownTarget += $targetVal;
    $totalBreakdownCurrent += $currentVal;
    
    $b['pct'] = round(($currentVal / $targetVal) * 100);
    $b['target_int'] = $targetVal;
    $b['min_target_int'] = $minTargetVal;
}
unset($b);

// Overall Math
$overallPct = 0;
if ($totalBreakdownTarget > 0) {
    $overallPct = round(($totalBreakdownCurrent / $totalBreakdownTarget) * 100);
    $hasCompletedAt = isset($task['completed_at']) && $task['completed_at'] !== null;
    $shouldUpdate = ($overallPct != $task['progress']);
    
    if ($overallPct == 100 && !$hasCompletedAt) $shouldUpdate = true;
    if ($overallPct < 100 && $hasCompletedAt) $shouldUpdate = true;

    if ($shouldUpdate) {
        if ($overallPct == 100) {
            $u_stmt = $pdo->prepare('UPDATE tasks SET progress = ?, completed_at = NOW() WHERE id = ?');
        } else {
            $u_stmt = $pdo->prepare('UPDATE tasks SET progress = ?, completed_at = NULL WHERE id = ?');
        }
        $u_stmt->execute([$overallPct, $task_id]);

        // Evaluate Milestone Emails securely locking flags to prevent spam
        if ($overallPct >= 50 && $overallPct < 100 && $task['progress_50_reminded'] == 0) {
            sendTaskEmail($user_id, 'progress_50', ['title' => $task['title']]);
            $pdo->prepare('UPDATE tasks SET progress_50_reminded = 1 WHERE id = ?')->execute([$task_id]);
        }
        if ($overallPct == 100 && $task['progress_100_reminded'] == 0) {
            sendTaskEmail($user_id, 'progress_100', ['title' => $task['title']]);
            $pdo->prepare('UPDATE tasks SET progress_100_reminded = 1 WHERE id = ?')->execute([$task_id]);
        }
    }
}

// Time analytics
$dueDate = new DateTime($task['due_date']);
$today = new DateTime('now');
$daysDiff = $today->diff($dueDate)->format("%r%a");
$daysRemaining = (int)$daysDiff;

$daysRemainingStr = "";
if ($daysRemaining < 0) {
    $daysRemainingStr = abs($daysRemaining) . " DAYS OVERDUE";
} else if ($daysRemaining == 0) {
    $daysRemainingStr = "DUE TODAY";
} else {
    $daysRemainingStr = $daysRemaining . " DAYS REMAINING";
}

$reqPace = 0;
$curPace = 0;
$confidence = "HIGH";
$onTrack = true;

if ($daysRemaining > 0 && $overallPct < 100) {
    $reqPace = round((100 - $overallPct) / $daysRemaining, 2);
}

$createdDate = new DateTime($task['created_at']);
$daysElapsed = $createdDate->diff($today)->days;
if ($daysElapsed <= 0) $daysElapsed = 1;

if ($overallPct > 0) {
    $curPace = round($overallPct / $daysElapsed, 2);
}

if ($curPace < $reqPace && $overallPct < 100) {
    $confidence = "LOW";
    $onTrack = false;
} else if ($overallPct == 100) {
    $onTrack = true;
    $confidence = "COMPLETED";
}

$statusBadge = $onTrack ? 'ON TRACK' : 'FALLING BEHIND';
$diffPct = round($curPace - $reqPace, 1);
$motivationalStr = "You are right on track. Consistent progress pays off.";

if ($overallPct == 100) {
    $motivationalStr = "Excellent work. You have reached 100% completion!";
} else if ($diffPct > 0) {
    $motivationalStr = "You are $diffPct% ahead of your required daily pace. Maintain this velocity.";
} else if ($diffPct < 0) {
    $absDiff = abs($diffPct);
    $motivationalStr = "You have fallen $absDiff% behind your required daily pace. Let's make it up tomorrow.";
}

echo json_encode([
    "status" => "success",
    "parent_task" => [
        "title" => $task['title'],
        "description" => $task['description'],
        "due_date" => $task['due_date'],
        "days_remaining_badge" => $daysRemainingStr,
        "days_remaining_int" => $daysRemaining > 0 ? str_pad($daysRemaining, 2, "0", STR_PAD_LEFT) . " Days" : "00 Days",
        "status_badge" => $statusBadge,
        "overall_progress" => $overallPct,
        "motivation" => $motivationalStr,
        "analytics" => [
            "req_pace" => $reqPace . "% / day",
            "cur_pace" => $curPace . "% / day",
            "confidence" => $confidence
        ]
    ],
    "breakdowns" => $breakdowns
]);
?>
