<?php
// Prevent date() functions from throwing HTML Warnings on local MacOS servers
date_default_timezone_set('UTC');

// Shield: Force silent API mode to prevent HTML warnings from corrupting the JSON response
ini_set('display_errors', 0);
error_reporting(0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

if (session_status() === PHP_SESSION_NONE) {
    session_start(); // Start sessions for handling user login universally
}

// 1. Detect environment (Railway/Render sets these variables)
$is_cloud = getenv('MYSQL_HOST') || getenv('DB_HOST');

if ($is_cloud) {
    // CLOUD SETTINGS
    $host = getenv('MYSQL_HOST') ?: getenv('DB_HOST');
    $db   = getenv('MYSQL_DATABASE') ?: getenv('DB_NAME');
    $user = getenv('MYSQL_USER') ?: getenv('DB_USER');
    $pass = getenv('MYSQL_PASSWORD') ?: getenv('DB_PASS');
} else {
    // LOCAL SETTINGS (Your Mac)
    $host = '127.0.0.1';
    $db   = 'taskflow';
    $user = 'root';
    $pass = ''; // Default XAMPP/MAMP without password or Homebrew default
}

$charset = 'utf8mb4';
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database connection failed!"]);
    exit;
}
?>
