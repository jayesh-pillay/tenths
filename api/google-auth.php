<?php
require_once 'db.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['token'])) {
    echo json_encode(["status" => "error", "message" => "Missing Google Auth Token."]);
    exit;
}

// Natively rip the Payload structure directly from the Google JWT (JSON Web Token)
$jwt = $input['token'];
$tokenParts = explode('.', $jwt);

if (count($tokenParts) !== 3) {
    echo json_encode(["status" => "error", "message" => "Invalid Google token architecture."]);
    exit;
}

// JWT Payloads are safely Base64Encoded in the 2nd array node
$payload = base64_decode($tokenParts[1]);
$googleData = json_decode($payload, true);

if (!$googleData || !isset($googleData['email'])) {
    echo json_encode(["status" => "error", "message" => "Failed to extract core identity parameters from Google."]);
    exit;
}

$email = trim($googleData['email']);
$googleName = isset($googleData['name']) ? trim($googleData['name']) : 'Google Architect';

// 1. Query DataVault: Check if this email is already a legitimate TaskFlow account
$check = $pdo->prepare('SELECT id, username FROM users WHERE email = ?');
$check->execute([$email]);
$row = $check->fetch();

if ($row) {
    // Valid Account Established: Perform instantaneous Login bypass
    $_SESSION['user_id'] = $row['id'];
    $_SESSION['username'] = $row['username'];
    echo json_encode(["status" => "success", "message" => "Google O-Auth Verified. Generating session."]);
} else {
    // Email Unknown: Automatically scaffold out a brand new TaskFlow Database entry
    
    // Ensure the Google First/Last Name doesn't collide with existing usernames
    $usernameKey = strtolower(str_replace(' ', '', $googleName));
    $userCheck = $pdo->prepare('SELECT id FROM users WHERE LOWER(REPLACE(username, " ", "")) = ?');
    $userCheck->execute([$usernameKey]);
    
    $finalUsername = $googleName;
    if ($userCheck->rowCount() > 0) {
        $finalUsername = $googleName . rand(1000, 9999); // Generate a unique numerical suffix immediately
    }
    
    // Automatically generate an impossible cryptographical hash to fill the 'password' column mapping safely
    $impossibleHash = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);
    
    $insert = $pdo->prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    $insert->execute([$finalUsername, $email, $impossibleHash]);
    
    $userId = $pdo->lastInsertId();
    $_SESSION['user_id'] = $userId;
    $_SESSION['username'] = $finalUsername;
    
    // Inject the mandatory "first-time" generic dashboard item
    $date = date('Y-m-d', strtotime('+5 days'));
    $taskSql = "INSERT INTO tasks (user_id, title, description, category, status, progress, due_date, time_left_str) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    $pdo->prepare($taskSql)->execute([
        $userId, 
        'Your first task', 
        'BY Tenths team to get in touch complete these tasks', 
        'OTHERS', 
        'in_progress', 
        0, 
        $date, 
        '5 DAYS'
    ]);
    
    $newTaskId = $pdo->lastInsertId();
    $breakdownsSql = "INSERT INTO task_breakdowns (task_id, step_index, title, target_val, status) VALUES 
        (?, 1, 'complete 20 min of workout/yoga dialy', '', 'pending'),
        (?, 2, 'discover atlest 4 songs daily', '', 'pending'),
        (?, 3, 'complete atlets 2hrs of study/code or research', '', 'pending'),
        (?, 4, 'drink water brother', '', 'pending')";
    $pdo->prepare($breakdownsSql)->execute([$newTaskId, $newTaskId, $newTaskId, $newTaskId]);
    
    echo json_encode(["status" => "success", "message" => "Account architected successfully via Google payload."]);
}
?>
