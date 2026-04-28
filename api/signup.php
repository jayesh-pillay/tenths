<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if(!isset($data['username']) || !isset($data['email']) || !isset($data['password'])) {
        echo json_encode(["status" => "error", "message" => "Missing required fields"]);
        exit;
    }

    $username = trim($data['username']);
    $email = trim($data['email']);
    $password = password_hash($data['password'], PASSWORD_DEFAULT);

    // Filter against whitespace / case alterations for absolute strictness
    $usernameKey = strtolower(str_replace(' ', '', $username));
    // Query ensuring the normalized username doesn't exist
    $userCheck = $pdo->prepare('SELECT id FROM users WHERE LOWER(REPLACE(username, " ", "")) = ?');
    $userCheck->execute([$usernameKey]);
    if ($userCheck->rowCount() > 0) {
        echo json_encode(["status" => "error", "message" => "Username already exists. Please choose a unique account name."]);
        exit;
    }

    try {
        $stmt = $pdo->prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
        $stmt->execute([$username, $email, $password]);
        
        $userId = $pdo->lastInsertId();
        
        // Auto-login after signup
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $username;

        // Give them a custom onboarding task as requested
        $date = date('Y-m-d', strtotime('+7 days'));
        $taskSql = "INSERT INTO tasks (user_id, title, description, measure_type, total_count, category, status, progress, due_date, time_left_str) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $pdo->prepare($taskSql)->execute([
            $userId, 
            'Your First Task', 
            'Lets Get Started', 
            'Skills', 
            3, 
            'Skills', 
            'pending', 
            0, 
            $date, 
            '7 DAYS'
        ]);
        
        $newTaskId = $pdo->lastInsertId();
        $breakdownsSql = "INSERT INTO task_breakdowns (task_id, step_index, title, min_target_val, target_val, status) VALUES 
            (?, 1, 'New Music', '5', '10', 'pending'),
            (?, 2, 'Pushup', '25', '50', 'pending'),
            (?, 3, 'Yoga', '20min', '30', 'pending')";
        $pdo->prepare($breakdownsSql)->execute([$newTaskId, $newTaskId, $newTaskId]);

        echo json_encode(["status" => "success", "message" => "User registered successfully"]);
    } catch (\PDOException $e) {
        if ($e->getCode() == 23000) {
            echo json_encode(["status" => "error", "message" => "email already exists ,try login In"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid method"]);
}
?>
