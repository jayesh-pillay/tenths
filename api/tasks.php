<?php
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$user_id = $_SESSION['user_id'];

// Get all tasks for user strictly without count limits
$stmt = $pdo->prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC');
$stmt->execute([$user_id]);
$tasks = $stmt->fetchAll();

$formattedTasks = [];

foreach ($tasks as $task) {
    // Determine dynamic derived status locally
    $calculated_status = 'PENDING';
    $is_overdue = false;
    
    $today = new DateTime();
    $today->setTime(0, 0, 0);
    $due = new DateTime($task['due_date']);
    $due->setTime(0, 0, 0);

    if ($task['progress'] >= 100 || $task['status'] === 'completed') {
        $calculated_status = 'COMPLETED';
    } else {
        if ($due < $today) {
            $calculated_status = 'OVERDUE';
            $is_overdue = true;
        } else if ($task['progress'] > 0) {
            $calculated_status = 'IN PROGRESS';
        } else {
            $calculated_status = 'PENDING';
        }
    }

    $formattedTasks[] = [
        "id" => $task['id'],
        "title" => $task['title'],
        "description" => $task['description'],
        "due_date" => $task['due_date'],
        "due_date_formatted" => date("M d, Y", strtotime($task['due_date'])),
        "progress" => $task['progress'],
        "status" => $calculated_status,
        "is_overdue" => $is_overdue,
        "archived" => (int)$task['archived']
    ];
}

echo json_encode([
    "status" => "success",
    "tasks" => $formattedTasks
]);
?>
