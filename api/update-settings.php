<?php
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['setting_key']) || !isset($input['setting_value'])) {
    echo json_encode(["status" => "error", "message" => "Invalid parameters"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$key = $input['setting_key'];
$val = $input['setting_value'];

// Whitelist permitted keys to protect database from arbitrary injection mapping
$allowedKeys = [
    'theme_mode' => 'string',
    'notif_email_summary' => 'bool',
    'notif_push' => 'bool',
    'notif_tips' => 'bool'
];

if (!array_key_exists($key, $allowedKeys)) {
    echo json_encode(["status" => "error", "message" => "Unrecognized setting type."]);
    exit;
}

// Data validation
if ($allowedKeys[$key] === 'bool') {
    // MySQL handles booleans natively as TINYINT (0 or 1). Cast explicitly here.
    $val = $val ? 1 : 0;
} else if ($key === 'theme_mode') {
    $val = ($val === 'dark') ? 'dark' : 'light';
}

$stmt = $pdo->prepare("UPDATE users SET `$key` = ? WHERE id = ?");
if ($stmt->execute([$val, $user_id])) {
    echo json_encode(["status" => "success", "message" => "Preference serialized."]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to serialize preference."]);
}
?>
