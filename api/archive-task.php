<?php
// api/archive-task.php - Toggle archive status for one or more tasks
header('Content-Type: application/json');
require_once 'db.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$ids = $data['ids'] ?? [];
$archive = $data['archive'] ?? true; // Default to archiving

if (empty($ids)) {
    echo json_encode(['status' => 'error', 'message' => 'No task IDs provided']);
    exit;
}

$user_id = $_SESSION['user_id'];
$placeholders = implode(',', array_fill(0, count($ids), '?'));
$archiveVal = $archive ? 1 : 0;

try {
    $stmt = $pdo->prepare("UPDATE tasks SET archived = ? WHERE id IN ($placeholders) AND user_id = ?");
    $params = array_merge([$archiveVal], $ids, [$user_id]);
    $stmt->execute($params);

    echo json_encode(['status' => 'success', 'message' => 'Tasks updated successfully']);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
