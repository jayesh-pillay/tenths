<?php
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$query = isset($_GET['q']) ? trim($_GET['q']) : '';

if (empty($query)) {
    echo json_encode(["status" => "success", "data" => []]);
    exit;
}

$searchParam = "%" . $query . "%";

try {
    $stmt = $pdo->prepare("SELECT id, title, category, progress FROM tasks WHERE user_id = ? AND title LIKE ? LIMIT 5");
    $stmt->execute([$user_id, $searchParam]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(["status" => "success", "data" => $results]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
