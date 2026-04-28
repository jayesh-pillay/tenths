<?php
require_once __DIR__ . '/db.php';

try {
    // Forcefully inject the missing security columns into the existing users table
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64) DEFAULT NULL");
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires DATETIME DEFAULT NULL");

    echo "<h1>DATABASE REPAIRED!</h1>";
    echo "<p>Security columns have been successfully bolted onto the users table.</p>";
    echo "<p>You can now go back and try the Forgot Password tool.</p>";
} catch (\PDOException $e) {
    echo "<h1>REPAIR FAILED</h1>";
    echo "<p>Error: " . $e->getMessage() . "</p>";
}
?>
