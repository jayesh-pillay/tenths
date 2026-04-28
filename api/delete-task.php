<?php
require_once 'db.php';
require_once 'email_service.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['ids']) || !is_array($input['ids'])) {
    echo json_encode(["status" => "error", "message" => "Invalid payload"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$ids = $input['ids'];

try {
    $pdo->beginTransaction();

    // 1. Verify Task Ownership for all requested IDs securely
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $params = array_merge($ids, [$user_id]);

    $check_stmt = $pdo->prepare("SELECT id, title FROM tasks WHERE id IN ($placeholders) AND user_id = ?");
    $check_stmt->execute($params);
    $validTasks = $check_stmt->fetchAll(\PDO::FETCH_ASSOC);

    if (empty($validTasks)) {
        throw new \Exception("No valid tasks found or unauthorized.");
    }

    $validIds = array_column($validTasks, 'id');

    // 2. Erase Breakdowns (Foreign Key simulated cascading)
    $validPlaceholders = implode(',', array_fill(0, count($validIds), '?'));
    $del_breakdowns = $pdo->prepare("DELETE FROM task_breakdowns WHERE task_id IN ($validPlaceholders)");
    $del_breakdowns->execute($validIds);

    // 3. Erase Parent Tasks
    $del_tasks = $pdo->prepare("DELETE FROM tasks WHERE id IN ($validPlaceholders)");
    $del_tasks->execute($validIds);

    $pdo->commit();

    // Fire Email Notifications
    foreach ($validTasks as $t) {
        sendTaskEmail($user_id, 'deleted', [
            'title' => $t['title']
        ]);
    }

    echo json_encode(["status" => "success", "message" => "Successfully deleted " . count($validIds) . " tasks"]);

} catch (\Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
