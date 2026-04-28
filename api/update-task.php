<?php
require_once 'db.php';
require_once 'email_service.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['task_id'])) {
    echo json_encode(["status" => "error", "message" => "Invalid payload"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$task_id = (int)$input['task_id'];
$title = $input['title'] ?? '';
$description = $input['description'] ?? '';
$due_date = $input['due_date'] ?? '';
$breakdowns = $input['breakdowns'] ?? [];

if (empty($title) || empty($due_date)) {
    echo json_encode(["status" => "error", "message" => "Title and deadline are required."]);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Verify Task Ownership
    $check_stmt = $pdo->prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?');
    $check_stmt->execute([$task_id, $user_id]);
    if (!$check_stmt->fetch()) {
        throw new \Exception("Task not found or unauthorized");
    }

    // 2. Update Parent Task
    $u_stmt = $pdo->prepare('UPDATE tasks SET title = ?, description = ?, due_date = ? WHERE id = ?');
    $u_stmt->execute([$title, $description, $due_date, $task_id]);

    // 3. Sync Breakdowns
    // Get all existing breakdown DB IDs
    $b_stmt = $pdo->prepare('SELECT id FROM task_breakdowns WHERE task_id = ?');
    $b_stmt->execute([$task_id]);
    $existingRows = $b_stmt->fetchAll(\PDO::FETCH_COLUMN);
    $existingIdsMap = array_flip($existingRows); // id => index

    $newCount = count($breakdowns);

    // Prepare statements
    $insert_stmt = $pdo->prepare('INSERT INTO task_breakdowns (task_id, step_index, title, min_target_val, target_val, current_val, status) VALUES (?, ?, ?, ?, ?, 0, "pending")');
    $update_stmt = $pdo->prepare('UPDATE task_breakdowns SET title = ?, min_target_val = ?, target_val = ?, step_index = ? WHERE id = ?');

    $step = 1;
    foreach ($breakdowns as $b) {
        $b_id = $b['id'] ?? null;
        $b_title = $b['title'] ?? '';
        $b_min_target = $b['min_target_val'] ?? '';
        $b_target = $b['target_val'] ?? ''; // e.g. "4", we store explicitly

        if (is_numeric($b_id) && isset($existingIdsMap[$b_id])) {
            // It's an UPDATE!
            $update_stmt->execute([$b_title, $b_min_target, $b_target, $step, $b_id]);
            unset($existingIdsMap[$b_id]); // We processed it, so don't delete!
        } else {
            // It's an INSERT (new subject)
            $insert_stmt->execute([$task_id, $step, $b_title, $b_min_target, $b_target]);
        }
        $step++;
    }

    // 4. Delete explicitly removed rows
    $idsToDelete = array_keys($existingIdsMap);
    if (!empty($idsToDelete)) {
        $placeholders = implode(',', array_fill(0, count($idsToDelete), '?'));
        $del_stmt = $pdo->prepare("DELETE FROM task_breakdowns WHERE id IN ($placeholders)");
        $del_stmt->execute($idsToDelete);
    }

    // Note: We don't forcefully recalculate parent overall_progress exactly here,
    // because api/task-view.php dynamically computes it and forces the UPDATE upon load!

    $pdo->commit();

    // Fire Email Notification
    sendTaskEmail($user_id, 'updated', [
        'title' => $title,
        'due_date' => $due_date
    ]);

    echo json_encode(["status" => "success", "message" => "Task updated successfully"]);

} catch (\Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
