<?php
require_once 'db.php';
require_once 'email_service.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized. Please log in."]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(["status" => "error", "message" => "Invalid input data."]);
    exit;
}

$user_id = $_SESSION['user_id'];
$title = $input['title'] ?? '';
$description = $input['description'] ?? '';
$measure_type = $input['measuring_type'] ?? '';
$measure_other = $input['measuring_other'] ?? ''; 
$total_count = isset($input['total_count']) ? (int)$input['total_count'] : 0;
$due_date = $input['due_date'] ?? '';
$breakdowns = $input['breakdowns'] ?? [];

// Date Format Translator: Convert DD/MM/YYYY to YYYY-MM-DD for MySQL stability
if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $due_date, $matches)) {
    $due_date = $matches[3] . '-' . sprintf('%02d', $matches[2]) . '-' . sprintf('%02d', $matches[1]);
}

// Logic Validation: Minimum Target cannot exceed Total Target
foreach ($breakdowns as $b) {
    $b_title = $b['title'] ?? 'Section';
    $minStr = $b['min_target_val'] ?? '';
    $maxStr = $b['target_val'] ?? '';

    $extractNum = function($str) {
        preg_match_all('!\d+!', $str, $matches);
        return isset($matches[0]) ? (int)implode('', $matches[0]) : 0;
    };

    $minVal = $extractNum($minStr);
    $maxVal = $extractNum($maxStr);

    if ($minVal > $maxVal && $maxVal > 0) {
        echo json_encode(["status" => "error", "message" => "Error in '$b_title': Minimum target ($minStr) cannot be more than total target ($maxStr)."]);
        exit;
    }
}

if (empty($title) || empty($due_date)) {
    echo json_encode(["status" => "error", "message" => "Title and deadline are required."]);
    exit;
}

// Fallback logic for Category. It can just equal what they are measuring.
$category = $measure_type === 'Other' ? $measure_other : $measure_type;

try {
    $pdo->beginTransaction();

    // 1. Insert Parent Task
    $stmt = $pdo->prepare('
        INSERT INTO tasks (user_id, title, description, measure_type, total_count, category, status, progress, due_date)
        VALUES (?, ?, ?, ?, ?, ?, "pending", 0, ?)
    ');
    
    // We use the category column for a quick top-level string (Subjects, etc.) required by previous dashboard
    $stmt->execute([
        $user_id,
        $title,
        $description,
        $measure_type === 'Other' ? $measure_other : $measure_type, // measure_type directly saves the context unit
        $total_count,
        $category,
        $due_date
    ]);
    
    $task_id = $pdo->lastInsertId();

    // 2. Insert Breakdowns
    if (!empty($breakdowns) && $total_count > 0) {
        $b_stmt = $pdo->prepare('
            INSERT INTO task_breakdowns (task_id, step_index, title, min_target_val, target_val, status)
            VALUES (?, ?, ?, ?, ?, "pending")
        ');
        
        foreach ($breakdowns as $b) {
            $b_stmt->execute([
                $task_id,
                $b['step_index'],
                $b['title'],
                $b['min_target_val'] ?? '',
                $b['target_val']
            ]);
        }
    }

    $pdo->commit();

    // Fire Email Notification
    sendTaskEmail($user_id, 'created', [
        'title' => $title,
        'due_date' => $due_date,
        'category' => $category
    ]);

    echo json_encode([
        "status" => "success",
        "message" => "Task created successfully.",
        "task_id" => $task_id
    ]);

} catch (\PDOException $e) {
    $pdo->rollBack();
    // For production, avoid exposing $e->getMessage() directly, but good for debugging our SQL schema
    echo json_encode(["status" => "error", "message" => "Failed to create task: " . $e->getMessage()]);
}
?>
